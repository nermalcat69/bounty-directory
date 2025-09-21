import "server-only";

import { BountyFetcher } from "@/lib/bounty-fetcher";
import { redisCache } from "@/lib/redis-cache";

const WORKER_LOCK_KEY = "worker:bounty:lock";
const WORKER_LOCK_TTL = 60 * 60; // 1 hour
const WORKER_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

export class BountyWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private fetcher: BountyFetcher;

  constructor() {
    this.fetcher = new BountyFetcher(process.env.GITHUB_TOKEN);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Bounty worker is already running");
      return;
    }

    console.log("Starting bounty worker...");
    this.isRunning = true;

    // Run immediately on start
    await this.runFetch();

    // Schedule recurring runs
    this.intervalId = setInterval(async () => {
      await this.runFetch();
    }, WORKER_INTERVAL);

    console.log(`Bounty worker started with ${WORKER_INTERVAL / 1000 / 60} minute interval`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("Bounty worker is not running");
      return;
    }

    console.log("Stopping bounty worker...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Release lock if we have it
    await redisCache.del(WORKER_LOCK_KEY);

    console.log("Bounty worker stopped");
  }

  private async runFetch(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Try to acquire lock
      const lockAcquired = await redisCache.setNX(
        WORKER_LOCK_KEY,
        process.pid?.toString() || "unknown",
        WORKER_LOCK_TTL
      );

      if (!lockAcquired) {
        console.log("Another worker instance is running, skipping...");
        return;
      }

      console.log("Worker lock acquired, starting fetch...");

      const startTime = Date.now();
      const result = await this.fetcher.fetchAndUpdateBounties();
      const duration = Date.now() - startTime;

      console.log(`Fetch completed in ${duration}ms:`, {
        processed: result.processed,
        newIssues: result.newIssues,
        rateLimit: result.rateLimit,
      });

      // Store last run stats
      await redisCache.setex("worker:bounty:last_run", 24 * 60 * 60, JSON.stringify({
        timestamp: new Date().toISOString(),
        duration,
        processed: result.processed,
        newIssues: result.newIssues,
        rateLimit: result.rateLimit,
      }));

    } catch (error) {
      console.error("Error in bounty worker:", error);

      // Store error info
      await redisCache.setex("worker:bounty:last_error", 24 * 60 * 60, JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }));

    } finally {
      // Always release the lock
      await redisCache.del(WORKER_LOCK_KEY);
    }
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    lastRun?: any;
    lastError?: any;
    rateLimit?: { remaining: number; reset: number };
  }> {
    const lastRunData = await redisCache.get("worker:bounty:last_run");
    const lastErrorData = await redisCache.get("worker:bounty:last_error");
    const rateLimit = await this.fetcher.getRateLimit();

    return {
      isRunning: this.isRunning,
      lastRun: lastRunData ? JSON.parse(lastRunData) : undefined,
      lastError: lastErrorData ? JSON.parse(lastErrorData) : undefined,
      rateLimit,
    };
  }
}

// Singleton instance
let workerInstance: BountyWorker | null = null;

export function getBountyWorker(): BountyWorker {
  if (!workerInstance) {
    workerInstance = new BountyWorker();
  }
  return workerInstance;
}

// Auto-start in production
if (process.env.NODE_ENV === "production" && process.env.AUTO_START_WORKER === "true") {
  const worker = getBountyWorker();
  worker.start().catch(console.error);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Received SIGINT, shutting down worker...");
    await worker.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, shutting down worker...");
    await worker.stop();
    process.exit(0);
  });
}