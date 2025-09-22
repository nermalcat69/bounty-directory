import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { issues, notifications, alerts } from "@/db/schema";
import { NotificationService } from "@/lib/notifications";
import { eq } from "drizzle-orm";
import { redisCache } from "@/lib/redis-cache";
import { revalidatePath, revalidateTag } from "next/cache";
import { updateBountyCacheForIssue } from "@/lib/postgres-cache-updater";
import { BountyDeduplicationService } from "@/lib/bounty-deduplication-service";
import crypto from "crypto";

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
  
  const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;
  return signature === expectedSignatureWithPrefix;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    
    if (!signature || !event) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
    }

    const payload = await request.text();
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("GITHUB_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    // Verify the webhook signature
    if (!verifySignature(payload, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(payload);

    // Handle different GitHub events
    if (event === "issues") {
      await handleIssueEvent(data);
    } else if (event === "issue_comment") {
      await handleIssueCommentEvent(data);
    } else if (event === "pull_request") {
      await handlePullRequestEvent(data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GitHub webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleIssueEvent(data: any) {
  const { action, issue, repository } = data;
  
  // Only process opened, edited, labeled, unlabeled, or closed issues
  if (!["opened", "edited", "labeled", "unlabeled", "closed", "reopened"].includes(action)) {
    return;
  }
  
  // Check if this is a bounty issue
  const isBountyIssue = issue.labels?.some((label: any) => 
    label.name.includes('💎 Bounty') || 
    label.name.includes('$') ||
    /bounty|reward|prize/i.test(label.name)
  );

  const issueData = {
    id: issue.id.toString(),
    repo: repository.full_name,
    number: issue.number,
    title: issue.title,
    body: issue.body || "",
    html_url: issue.html_url,
    user_login: issue.user.login,
    created_at: new Date(issue.created_at),
    updated_at: new Date(issue.updated_at),
    labels: JSON.stringify(issue.labels.map((label: any) => label.name)),
    raw: JSON.stringify(issue),
    comments: issue.comments || 0,
    state: issue.state,
    assignee: issue.assignee?.login || null,
    language: repository.language || null,
  };

  // Upsert issue to database
  await db
    .insert(issues)
    .values(issueData)
    .onConflictDoUpdate({
      target: issues.id,
      set: {
        title: issueData.title,
        body: issueData.body,
        updated_at: issueData.updated_at,
        labels: issueData.labels,
        raw: issueData.raw,
        comments: issueData.comments,
        state: issueData.state,
        assignee: issueData.assignee,
        language: issueData.language,
      },
    });

  // Handle Redis cache updates for bounty issues
  if (isBountyIssue) {
    console.log(`Bounty issue ${action}: ${issue.html_url}`);
    
    if (action === "closed") {
      // Remove closed bounty from cache
      await BountyDeduplicationService.removeBountyFromCache(issue.id);
      console.log(`Removed closed bounty ${issue.id} from cache`);
    } else if (["opened", "edited", "labeled", "unlabeled", "reopened"].includes(action)) {
      // Convert issue to bounty format and update cache
      const bountyData = {
        id: issue.id,
        title: issue.title,
        html_url: issue.html_url,
        repo: repository.full_name,
        user_login: issue.user.login,
        user_avatar_url: issue.user.avatar_url,
        amount: issue.labels?.find((label: any) => 
          label.name.includes('$') || 
          label.name.includes('💎 Bounty') ||
          /bounty|reward|prize/i.test(label.name)
        )?.name || "",
        language: repository.language || "Unknown",
        labels: issue.labels?.map((label: any) => ({
          name: label.name,
          color: label.color
        })) || [],
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        body: issue.body?.substring(0, 500) || "",
        assignee: issue.assignee?.login || null,
        comments: issue.comments || 0
      };
      
      // Update cache with single bounty (merge mode)
      const cacheResult = await BountyDeduplicationService.updateSnapshotsCache([bountyData], 'merge');
      
      if (cacheResult.success) {
        console.log(`Updated cache for bounty ${issue.id}: ${cacheResult.message}`);
      } else {
        console.error(`Failed to update cache for bounty ${issue.id}: ${cacheResult.message}`);
      }
    }
    
    // Revalidate ISR pages and tags based on action
    if (action === "closed") {
      // Issue closed - revalidate all bounty-related pages and tags
      revalidateTag('bounties');
      revalidateTag('bounty-list');
      revalidateTag('total-bounty-amount');
      revalidateTag('homepage');
      revalidatePath('/');
      revalidatePath('/bounties');
      console.log('ISR revalidation triggered for closed bounty issue');
    } else if (action === "opened" || action === "labeled" || action === "unlabeled" || action === "edited") {
      // Issue opened/updated - revalidate totals and homepage
      revalidateTag('total-bounty-amount');
      revalidateTag('homepage');
      revalidateTag('bounties');
      revalidatePath('/');
      console.log(`ISR revalidation triggered for ${action} bounty issue`);
    }
  }

  // If this is a new issue or significant update, process notifications
  if (action === "opened" || action === "labeled") {
    await processNotificationsForIssue(issue, repository);
  }
}

async function handleIssueCommentEvent(data: any) {
  const { action, issue, comment, repository } = data;
  
  if (action !== "created") {
    return;
  }

  // Update comment count in database
  await db
    .update(issues)
    .set({
      comments: issue.comments,
      updated_at: new Date(),
    })
    .where(eq(issues.id, issue.id.toString()));

  // Could trigger notifications for new comments if needed
}

async function handlePullRequestEvent(data: any) {
  const { action, pull_request, repository } = data;
  
  // Only process opened PRs for now
  if (action !== "opened") {
    return;
  }

  // Convert PR to issue-like format for notifications
  const prAsIssue = {
    id: pull_request.id,
    repo: repository.full_name,
    number: pull_request.number,
    title: pull_request.title,
    body: pull_request.body || "",
    html_url: pull_request.html_url,
    user_login: pull_request.user.login,
    created_at: pull_request.created_at,
    labels: pull_request.labels?.map((label: any) => label.name) || [],
    language: repository.language,
  };

  await processNotificationsForIssue(prAsIssue, repository);
}

async function processNotificationsForIssue(issue: any, repository: any) {
  try {
    // Convert to BountyNotification format
    const bountyData = {
      id: issue.id.toString(),
      repo: repository.full_name,
      number: issue.number,
      title: issue.title,
      body: issue.body || "",
      html_url: issue.html_url,
      user_login: issue.user.login,
      created_at: issue.created_at,
      labels: Array.isArray(issue.labels) ? issue.labels : [],
      language: repository.language || undefined,
    };

    // Get all active alerts
    const activeAlerts = await db.select().from(alerts).where(eq(alerts.active, true));
    
    // Convert database alerts to the expected Alert interface
    const alertsData = activeAlerts.map(alert => ({
      id: alert.id,
      user_id: alert.user_id!,
      repo: alert.repo,
      query: alert.query,
      delivery_method: alert.delivery_method as "discord" | "webhook" | "email",
      destination: alert.destination,
      active: alert.active!,
    }));

    // Process notifications
    const notificationService = new NotificationService();
    const results = await notificationService.processAlertsForBounties([bountyData], alertsData);

    // Log notifications to database
    const notificationRecords = results.results.map(result => ({
      issue_id: bountyData.id,
      alert_id: result.alertId,
      delivery_method: alertsData.find(a => a.id === result.alertId)?.delivery_method || "email",
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
    }));

    if (notificationRecords.length > 0) {
      await db.insert(notifications).values(notificationRecords);
    }

    console.log(`Processed ${results.processed} alerts for issue ${issue.number} in ${repository.full_name}`);
  } catch (error) {
    console.error("Error processing notifications for issue:", error);
  }
}