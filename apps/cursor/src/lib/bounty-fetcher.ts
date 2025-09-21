import "server-only";

import { db } from "@/db";
import { issues, alerts, notifications } from "@/db/schema";
import { redisCache } from "./redis-cache";
import { GitHubAPI, extractRepoFromUrl, extractLanguageFromRepository, fetchAntiworkBounties, type GitHubIssue } from "./github";
import { eq, and, sql } from "drizzle-orm";
import { isSpamIssue, logSpamUserFiltered } from "@/utils/spam-filter";
import { notificationService } from "./notifier";

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
        const etag = await redisCache.get(`github:etag:page:${page}`);

        try {
          const response = await this.github.searchIssues(query, page, 100, etag || undefined);
          rateLimit = response.rateLimit;

          // Update rate limit in Redis
          await redisCache.setex("ratelimit:remaining", 3600, rateLimit.remaining.toString());
          await redisCache.setex("ratelimit:reset", 3600, rateLimit.reset.toString());

          // Save new ETag
          if (response.etag) {
            await redisCache.setex(`github:etag:page:${page}`, 3600, response.etag);
          }

          // Process issues
          for (const issue of response.data.items) {
            // Check if issue is too old
            const issueDate = new Date(issue.created_at);
            if (issueDate < cutoffDate) {
              console.log(`Issue ${issue.id} is too old, stopping...`);
              break;
            }

            // Filter out spam users
            if (isSpamIssue(issue)) {
              logSpamUserFiltered(issue.user.login, issue.id);
              continue;
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
                user_avatar_url: issue.user.avatar_url,
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
                  user_avatar_url: issue.user.avatar_url,
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

      // Fetch antiwork bounties
      console.log("Fetching antiwork bounties...");
      try {
        const antiworkIssues = await fetchAntiworkBounties(this.github);
        console.log(`Found ${antiworkIssues.length} antiwork bounties`);
        
        for (const issue of antiworkIssues) {
          // Filter out spam users
          if (isSpamIssue(issue)) {
            logSpamUserFiltered(issue.user.login, issue.id);
            continue;
          }

          const existingIssue = await db.select().from(issues).where(eq(issues.id, issue.id.toString())).limit(1);
          
          if (existingIssue.length === 0) {
            // Extract repository info
            const repository = extractRepoFromUrl(issue.repository_url);
            const language = await extractLanguageFromRepository(this.github, issue.repository_url);
            
            // Insert new issue
             await db.insert(issues).values({
               id: issue.id.toString(),
               repo: repository,
               number: issue.number,
               title: issue.title,
               body: issue.body || "",
               html_url: issue.html_url,
               user_login: issue.user.login,
               created_at: new Date(issue.created_at),
               updated_at: new Date(issue.updated_at),
               labels: JSON.stringify(issue.labels),
               comments: issue.comments,
               state: issue.state,
               assignee: issue.assignee?.login || null,
               language: language || "Unknown",
               raw: JSON.stringify(issue),
             });
            
            newIssues++;
            newIssueIds.push(issue.id.toString());
          }
          
          processed++;
        }
      } catch (error) {
        console.error("Error fetching antiwork bounties:", error);
      }

      // Generate snapshot and cache in Redis
      await this.generateSnapshot();

      // Process notifications for new issues
      if (newIssueIds.length > 0) {
        await this.processNotifications();
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
    await redisCache.setex("snapshots:latest", 3600, JSON.stringify(latestBounties));

      // Cache top 100 bounties
      const top100 = latestBounties.slice(0, 100);
      await redisCache.setex("snapshots:top100", 3600, JSON.stringify(top100));

      // Invalidate related caches
      await redisCache.delMultiple([
        "bounty:languages", // Language statistics cache
        "bounty:total",     // Total bounty amount cache
        "snapshots:stats"   // Snapshot statistics cache
      ]);

    console.log(`Snapshot generated with ${latestBounties.length} issues and invalidated dependent caches`);
  }

  async processNotifications() {
    try {
      console.log("Processing notifications using notification service...");
      const result = await notificationService.processPendingNotifications();
      console.log("Notification processing completed:", result);
      return result;
    } catch (error) {
      console.error("Error processing notifications:", error);
      throw error;
    }
  }

  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    const remaining = await redisCache.get("ratelimit:remaining");
    const reset = await redisCache.get("ratelimit:reset");

    return {
      remaining: remaining ? parseInt(remaining) : 0,
      reset: reset ? parseInt(reset) : 0,
    };
  }
}