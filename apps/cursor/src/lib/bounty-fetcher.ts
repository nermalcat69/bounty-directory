import "server-only";

import { db } from "@/db";
import { issues, alerts, notifications } from "@/db/schema";
import { redis } from "./kv";
import { GitHubAPI, extractRepoFromUrl, extractLanguageFromRepository, type GitHubIssue } from "./github";
import { eq, and, sql } from "drizzle-orm";

export class BountyFetcher {
  private github: GitHubAPI;
  private maxPages = 5;
  private cutoffDays = 30;

  constructor(githubToken?: string) {
    this.github = new GitHubAPI(githubToken);
  }

  async fetchAndUpdateBounties(): Promise<{
    processed: number;
    newIssues: number;
    rateLimit: { remaining: number; reset: number };
  }> {
    console.log("Starting bounty fetch...");

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.cutoffDays);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    // Build search query
    const query = `label:"💎 Bounty" state:open created:>=${cutoffISO}`;
    
    let processed = 0;
    let newIssues = 0;
    let rateLimit = { remaining: 0, reset: 0 };
    const newIssueIds: string[] = [];

    try {
      for (let page = 1; page <= this.maxPages; page++) {
        console.log(`Fetching page ${page}...`);

        // Get cached ETag for this page
        const etag = await redis.get(`github:etag:page:${page}`);

        try {
          const response = await this.github.searchIssues(query, page, 100, etag || undefined);
          rateLimit = response.rateLimit;

          // Update rate limit in Redis
          await redis.setex("ratelimit:remaining", 3600, rateLimit.remaining.toString());
          await redis.setex("ratelimit:reset", 3600, rateLimit.reset.toString());

          // Save new ETag
          if (response.etag) {
            await redis.setex(`github:etag:page:${page}`, 3600, response.etag);
          }

          // Process issues
          for (const issue of response.data.items) {
            // Check if issue is too old
            const issueDate = new Date(issue.created_at);
            if (issueDate < cutoffDate) {
              console.log(`Issue ${issue.id} is too old, stopping...`);
              break;
            }

            const repo = extractRepoFromUrl(issue.repository_url);
            const language = await extractLanguageFromRepository(this.github, issue.repository_url);

            // Upsert issue
            const existingIssue = await db
              .select({ id: issues.id })
              .from(issues)
              .where(eq(issues.id, issue.id.toString()))
              .limit(1);

            const isNewIssue = existingIssue.length === 0;

            await db
              .insert(issues)
              .values({
                id: issue.id.toString(),
                repo,
                number: issue.number,
                title: issue.title,
                body: issue.body,
                html_url: issue.html_url,
                user_login: issue.user.login,
                created_at: new Date(issue.created_at),
                updated_at: new Date(issue.updated_at),
                labels: JSON.stringify(issue.labels.map(l => l.name)),
                raw: JSON.stringify(issue),
                comments: issue.comments,
                state: issue.state,
                assignee: issue.assignee?.login,
                language,
              })
              .onConflictDoUpdate({
                target: issues.id,
                set: {
                  title: issue.title,
                  body: issue.body,
                  updated_at: new Date(issue.updated_at),
                  labels: JSON.stringify(issue.labels.map(l => l.name)),
                  raw: JSON.stringify(issue),
                  comments: issue.comments,
                  state: issue.state,
                  assignee: issue.assignee?.login,
                  language,
                },
              });

            if (isNewIssue) {
              newIssues++;
              newIssueIds.push(issue.id.toString());
            }

            processed++;
          }

          // If we got less than 100 results, we're done
          if (response.data.items.length < 100) {
            break;
          }

        } catch (error) {
          if (error instanceof Error && error.message === "NOT_MODIFIED") {
            console.log(`Page ${page} not modified, using cached data`);
            continue;
          }
          throw error;
        }

        // Check rate limit
        if (rateLimit.remaining < 10) {
          console.log("Rate limit low, stopping...");
          break;
        }
      }

      // Generate snapshot and cache in Redis
      await this.generateSnapshot();

      // Process notifications for new issues
      if (newIssueIds.length > 0) {
        await this.processNotifications(newIssueIds);
      }

      console.log(`Fetch complete: ${processed} processed, ${newIssues} new issues`);

      return { processed, newIssues, rateLimit };

    } catch (error) {
      console.error("Error in bounty fetch:", error);
      throw error;
    }
  }

  private async generateSnapshot(): Promise<void> {
    console.log("Generating snapshot...");

    // Get latest bounties
    const latestBounties = await db
      .select({
        id: issues.id,
        repo: issues.repo,
        number: issues.number,
        title: issues.title,
        body: issues.body,
        html_url: issues.html_url,
        user_login: issues.user_login,
        created_at: issues.created_at,
        updated_at: issues.updated_at,
        labels: issues.labels,
        comments: issues.comments,
        state: issues.state,
        assignee: issues.assignee,
        language: issues.language,
      })
      .from(issues)
      .where(sql`${issues.created_at} >= now() - interval '30 days'`)
      .orderBy(sql`${issues.created_at} DESC`)
      .limit(1000);

    // Cache in Redis with 1 hour TTL
    await redis.setex("snapshots:latest", 3600, JSON.stringify(latestBounties));

    // Also create a top 100 snapshot
    const top100 = latestBounties.slice(0, 100);
    await redis.setex("snapshots:top100", 3600, JSON.stringify(top100));

    console.log(`Snapshot generated with ${latestBounties.length} issues`);
  }

  private async processNotifications(newIssueIds: string[]): Promise<void> {
    console.log(`Processing notifications for ${newIssueIds.length} new issues...`);

    // Check which issues haven't been notified yet
    const unnotifiedIssues: string[] = [];
    
    for (const issueId of newIssueIds) {
      const isNotified = await redis.sismember("bounty:notified", `gh:${issueId}`);
      if (!isNotified) {
        unnotifiedIssues.push(issueId);
      }
    }

    if (unnotifiedIssues.length === 0) {
      console.log("No new issues to notify");
      return;
    }

    // Get all active alerts
    const activeAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.active, true));

    for (const issueId of unnotifiedIssues) {
      // Get issue details
      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .limit(1);

      if (issue.length === 0) continue;

      const issueData = issue[0];

      // Find matching alerts
      for (const alert of activeAlerts) {
        let shouldNotify = false;

        if (alert.repo) {
          // Repo-specific alert
          shouldNotify = issueData.repo === alert.repo;
        } else if (alert.query) {
          // Query-based alert (simple string matching for now)
          const searchText = `${issueData.title} ${issueData.body} ${issueData.labels}`.toLowerCase();
          shouldNotify = searchText.includes(alert.query.toLowerCase());
        } else {
          // Global alert (all bounties)
          shouldNotify = true;
        }

        if (shouldNotify) {
          // Create notification record
          await db.insert(notifications).values({
            issue_id: issueId,
            alert_id: alert.id,
            delivery_method: alert.delivery_method,
            status: "pending",
          });

          console.log(`Created notification for issue ${issueId} to ${alert.delivery_method}`);
        }
      }

      // Mark issue as notified
      await redis.sadd("bounty:notified", `gh:${issueId}`);
      await redis.expire("bounty:notified", 30 * 24 * 60 * 60); // 30 days
    }

    console.log(`Processed notifications for ${unnotifiedIssues.length} issues`);
  }

  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    const remaining = await redis.get("ratelimit:remaining");
    const reset = await redis.get("ratelimit:reset");

    return {
      remaining: remaining ? parseInt(remaining) : 0,
      reset: reset ? parseInt(reset) : 0,
    };
  }
}