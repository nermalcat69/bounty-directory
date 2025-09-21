import { redisCache } from "./redis-cache";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

class SlidingWindowRateLimit {
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    const key = `ratelimit:${identifier}:${window}`;
    
    // Get current count
    const currentCountStr = await redisCache.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;
    const newCount = currentCount + 1;
    
    // Set the new count with expiration
    const ttlSeconds = Math.ceil(this.windowMs / 1000);
    await redisCache.setex(key, ttlSeconds, newCount.toString());
    
    const success = newCount <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - newCount);
    const reset = new Date((window + 1) * this.windowMs);
    
    return {
      success,
      limit: this.maxRequests,
      remaining,
      reset,
    };
  }
}

export const createPostRatelimit = new SlidingWindowRateLimit(10, 60 * 1000); // 10 requests per minute
