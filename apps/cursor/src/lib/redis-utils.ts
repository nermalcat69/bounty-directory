import { redis } from "./kv";

/**
 * Utility for Redis operations with proper error handling
 * Ensures connections are managed efficiently for API routes
 */
export class RedisUtils {
  /**
   * Ensure Redis is connected before operations
   */
  static async ensureConnection(): Promise<void> {
    if (redis.status !== 'ready') {
      try {
        await redis.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  /**
   * Execute a Redis operation with automatic error handling and connection check
   */
  static async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      await this.ensureConnection();
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