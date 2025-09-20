import { redis } from "./kv";

/**
 * Utility for Redis operations with proper error handling
 * Ensures connections are managed efficiently for API routes
 */
export class RedisUtils {
  /**
   * Execute a Redis operation with automatic error handling
   */
  static async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.error('Redis operation failed:', error);
      return null;
    }
  }

  /**
   * Get data from Redis with fallback
   */
  static async get(key: string): Promise<string | null> {
    return this.execute(() => redis.get(key));
  }

  /**
   * Set data in Redis with TTL
   */
  static async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const result = await this.execute(() => {
      if (ttlSeconds) {
        return redis.setex(key, ttlSeconds, value);
      }
      return redis.set(key, value);
    });
    return result === 'OK';
  }

  /**
   * Delete key from Redis
   */
  static async del(key: string): Promise<boolean> {
    const result = await this.execute(() => redis.del(key));
    return result === 1;
  }

  /**
   * Check Redis connection health
   */
  static async ping(): Promise<boolean> {
    const result = await this.execute(() => redis.ping());
    return result === 'PONG';
  }

  /**
   * Get Redis connection info for monitoring
   */
  static getConnectionInfo() {
    return {
      status: redis.status,
      options: {
        host: redis.options.host,
        port: redis.options.port,
        db: redis.options.db,
        lazyConnect: redis.options.lazyConnect,
        maxRetriesPerRequest: redis.options.maxRetriesPerRequest,
      }
    };
  }
}

export { redis };