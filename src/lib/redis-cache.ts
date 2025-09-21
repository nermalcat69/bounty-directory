import "server-only";

import { redis } from "./redis";

export class RedisCache {
  /**
   * Get a value from the cache
   */
  async get(key: string): Promise<string | null> {
    try {
      const value = await redis.get(key);
      return value;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in the cache with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, value);
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set a value with TTL (convenience method)
   */
  async setex(key: string, ttlSeconds: number, value: string): Promise<boolean> {
    try {
      await redis.setex(key, ttlSeconds, value);
      return true;
    } catch (error) {
      console.error(`Error setting cache key ${key} with TTL:`, error);
      return false;
    }
  }

  /**
   * Delete a key from the cache
   */
  async del(key: string): Promise<number> {
    try {
      const result = await redis.del(key);
      return result;
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Delete multiple keys from the cache
   */
  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      const result = await redis.del(...keys);
      return result;
    } catch (error) {
      console.error(`Error deleting multiple cache keys:`, error);
      return 0;
    }
  }

  /**
   * Set a key only if it doesn't exist (atomic operation)
   */
  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      let result;
      if (ttlSeconds) {
        // Use SET with NX and EX options using object syntax
        result = await redis.set(key, value, { EX: ttlSeconds, NX: true });
      } else {
        result = await redis.setnx(key, value);
      }
      return result === 'OK' || result === 1;
    } catch (error) {
      console.error(`Error setting NX cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 30): Promise<boolean> {
    return this.setNX(lockKey, "locked", ttlSeconds);
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockKey: string): Promise<boolean> {
    const result = await this.del(lockKey);
    return result > 0;
  }

  /**
   * Execute a function with a distributed lock
   */
  async withLock<T>(
    lockKey: string, 
    fn: () => Promise<T>, 
    ttlSeconds: number = 30,
    maxRetries: number = 3,
    retryDelayMs: number = 100
  ): Promise<T> {
    let retries = 0;
    
    while (retries < maxRetries) {
      const lockAcquired = await this.acquireLock(lockKey, ttlSeconds);
      
      if (lockAcquired) {
        try {
          return await fn();
        } finally {
          await this.releaseLock(lockKey);
        }
      }
      
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
    
    throw new Error(`Failed to acquire lock ${lockKey} after ${maxRetries} retries`);
  }

  /**
   * Add a member to a set (returns 1 if added, 0 if already exists)
   */
  async sadd(setKey: string, member: string): Promise<number> {
    try {
      const result = await redis.sadd(setKey, member);
      return result;
    } catch (error) {
      console.error(`Error adding to set ${setKey}:`, error);
      return 0;
    }
  }

  /**
   * Check if a member exists in a set
   */
  async sismember(setKey: string, member: string): Promise<boolean> {
    try {
      const result = await redis.sismember(setKey, member);
      return result === 1;
    } catch (error) {
      console.error(`Error checking set membership ${setKey}:`, error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      const result = await redis.incr(key);
      return result;
    } catch (error) {
      console.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    try {
      const result = await redis.decr(key);
      return result;
    } catch (error) {
      console.error(`Error decrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Cleanup expired entries (Redis handles this automatically)
   */
  async cleanupExpired(): Promise<number> {
    // Redis automatically handles expiration, so this is a no-op
    return 0;
  }

  /**
   * Ping the Redis server
   */
  async ping(): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Error pinging Redis:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    status: string;
  }> {
    try {
      const info = await redis.info('keyspace');
      const dbInfo = info.match(/db0:keys=(\d+)/);
      const totalEntries = dbInfo ? parseInt(dbInfo[1]) : 0;
      
      return {
        totalEntries,
        expiredEntries: 0, // Redis handles expiration automatically
        status: 'connected'
      };
    } catch (error) {
      console.error('Error getting Redis stats:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        status: 'error'
      };
    }
  }
}

export const redisCache = new RedisCache();