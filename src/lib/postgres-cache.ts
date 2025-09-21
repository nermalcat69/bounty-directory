import "server-only";

import { db } from "@/db";
import { fetchMetadata } from "@/db/schema";
import { eq, lt, count } from "drizzle-orm";

export class PostgresCache {
  /**
   * Get a value from the cache
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await db
        .select({ value: fetchMetadata.value, expires_at: fetchMetadata.expires_at })
        .from(fetchMetadata)
        .where(eq(fetchMetadata.key, key))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const record = result[0];
      
      // Check if expired
      if (record.expires_at && new Date() > record.expires_at) {
        // Clean up expired record
        await this.del(key);
        return null;
      }

      return record.value;
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
      const expires_at = ttlSeconds 
        ? new Date(Date.now() + ttlSeconds * 1000)
        : null;

      await db
        .insert(fetchMetadata)
        .values({
          key,
          value,
          expires_at,
        })
        .onConflictDoUpdate({
          target: fetchMetadata.key,
          set: {
            value,
            expires_at,
            updated_at: new Date(),
          },
        });

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
    return this.set(key, value, ttlSeconds);
  }

  /**
   * Delete a key from the cache
   */
  async del(key: string): Promise<number> {
    try {
      const result = await db
        .delete(fetchMetadata)
        .where(eq(fetchMetadata.key, key));

      return Array.isArray(result) ? result.length : 1;
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
      let deletedCount = 0;
      
      // Delete each key individually since Drizzle doesn't support IN with delete easily
      for (const key of keys) {
        const result = await this.del(key);
        deletedCount += result;
      }

      return deletedCount;
    } catch (error) {
      console.error(`Error deleting multiple cache keys:`, error);
      return 0;
    }
  }

  /**
   * Set a key only if it doesn't exist (like Redis SET with NX option)
   * Returns true if the key was set, false if it already existed
   */
  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
     const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
     
     try {
        await db.insert(fetchMetadata)
          .values({
            key,
            value,
            expires_at: expiresAt,
            created_at: new Date(),
            updated_at: new Date()
          });
        return true;
      } catch (error) {
        // If insert fails due to unique constraint, key already exists
        return false;
      }
   }

  /**
   * Acquire a lock with optional TTL
   */
  async acquireLock(lockKey: string, ttlSeconds: number = 30): Promise<boolean> {
    const lockValue = `lock_${Date.now()}_${Math.random()}`;
    return await this.setNX(`lock:${lockKey}`, lockValue, ttlSeconds);
  }

  /**
   * Release a lock
   */
  async releaseLock(lockKey: string): Promise<boolean> {
    const result = await this.del(`lock:${lockKey}`);
    return result > 0;
  }

  /**
   * Execute a function with a lock
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
      const acquired = await this.acquireLock(lockKey, ttlSeconds);
      
      if (acquired) {
        try {
          return await fn();
        } finally {
          await this.releaseLock(lockKey);
        }
      }
      
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * retries));
      }
    }
    
    throw new Error(`Failed to acquire lock '${lockKey}' after ${maxRetries} retries`);
  }

  /**
    * Add a member to a set (like Redis SADD)
    * Returns 1 if the member was added, 0 if it already existed
    */
   async sadd(setKey: string, member: string): Promise<number> {
     const memberKey = `${setKey}:member:${member}`;
     const added = await this.setNX(memberKey, "1");
     return added ? 1 : 0;
   }

   /**
    * Check if a member exists in a set (like Redis SISMEMBER)
    */
   async sismember(setKey: string, member: string): Promise<boolean> {
     const memberKey = `${setKey}:member:${member}`;
     const value = await this.get(memberKey);
     return value !== null;
   }

   /**
    * Increment a counter (like Redis INCR)
    * Returns the new value
    */
   async incr(key: string): Promise<number> {
     const currentValue = await this.get(key);
     const newValue = currentValue ? parseInt(currentValue) + 1 : 1;
     await this.set(key, newValue.toString());
     return newValue;
   }

   /**
    * Decrement a counter (like Redis DECR)
    * Returns the new value
    */
   async decr(key: string): Promise<number> {
     const currentValue = await this.get(key);
     const newValue = currentValue ? parseInt(currentValue) - 1 : -1;
     await this.set(key, newValue.toString());
     return newValue;
   }

   /**
    * Clean up expired entries
    */
  async cleanupExpired(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(fetchMetadata)
        .where(lt(fetchMetadata.expires_at, now));

      const deletedCount = Array.isArray(result) ? result.length : 0;
      console.log(`Cleaned up ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up expired cache entries:", error);
      return 0;
    }
  }

  /**
   * Check if cache is available (always true for PostgreSQL)
   */
  async ping(): Promise<boolean> {
    try {
      await db.select().from(fetchMetadata).limit(1);
      return true;
    } catch (error) {
      console.error("PostgreSQL cache ping failed:", error);
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
      const [totalResult] = await db
        .select({ count: count() })
        .from(fetchMetadata);

      const now = new Date();
      const [expiredResult] = await db
        .select({ count: count() })
        .from(fetchMetadata)
        .where(lt(fetchMetadata.expires_at, now));

      return {
        totalEntries: totalResult?.count || 0,
        expiredEntries: expiredResult?.count || 0,
        status: "ready",
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        status: "error",
      };
    }
  }
}

// Export singleton instance
export const postgresCache = new PostgresCache();