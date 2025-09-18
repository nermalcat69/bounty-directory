import { redis } from "./kv";

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
    
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(this.windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number || 0;
    
    const success = count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - count);
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
