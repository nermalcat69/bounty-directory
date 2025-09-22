import { redisCache } from "@/lib/redis-cache";

export interface BountyItem {
  id: number | string;
  title: string;
  html_url: string;
  repo: string;
  user_login: string;
  user_avatar_url?: string;
  amount?: string;
  language?: string;
  labels?: any[];
  state: string;
  created_at: string;
  updated_at: string;
  body?: string;
  assignee?: string | null;
  milestone?: string | null;
  comments?: number;
  raw?: any;
}

export class BountyDeduplicationService {
  private static readonly CACHE_LOCK_KEY = "bounty:cache:lock";
  private static readonly LOCK_TIMEOUT = 30000; // 30 seconds
  
  /**
   * Acquire a distributed lock to prevent concurrent cache updates
   */
  private static async acquireLock(): Promise<boolean> {
    try {
      const lockValue = Date.now().toString();
      // Use setex with a simple check for existence
      const existing = await redisCache.get(this.CACHE_LOCK_KEY);
      if (existing) {
        return false; // Lock already exists
      }
      
      await redisCache.setex(this.CACHE_LOCK_KEY, Math.floor(this.LOCK_TIMEOUT / 1000), lockValue);
      return true;
    } catch (error) {
      console.error("Failed to acquire cache lock:", error);
      return false;
    }
  }

  /**
   * Release the distributed lock
   */
  private static async releaseLock(): Promise<void> {
    try {
      await redisCache.del(this.CACHE_LOCK_KEY);
    } catch (error) {
      console.error("Failed to release cache lock:", error);
    }
  }

  /**
     * Filter bounties to exclude issues from before 2024
     */
   static filterByDate(bounties: BountyItem[]): BountyItem[] {
    const cutoffDate = new Date('2024-01-01T00:00:00.000Z');
    return bounties.filter(bounty => {
      const issueDate = new Date(bounty.created_at);
      return issueDate >= cutoffDate;
    });
  }

  /**
   * Deduplicate bounties by ID, keeping the most recently updated version
   */
  static deduplicateBounties(bounties: BountyItem[]): BountyItem[] {
    const bountyMap = new Map<string, BountyItem>();
    
    for (const bounty of bounties) {
      const id = bounty.id.toString();
      const existing = bountyMap.get(id);
      
      if (!existing) {
        bountyMap.set(id, bounty);
      } else {
        // Keep the most recently updated bounty
        const existingTime = new Date(existing.updated_at).getTime();
        const newTime = new Date(bounty.updated_at).getTime();
        
        if (newTime > existingTime) {
          bountyMap.set(id, bounty);
        }
      }
    }
    
    return Array.from(bountyMap.values());
  }

  /**
   * Safely update the snapshots cache with deduplication and locking
   */
  static async updateSnapshotsCache(
    newBounties: BountyItem[], 
    operation: 'merge' | 'replace' = 'merge',
    ttl: number = 1800 // 30 minutes default
  ): Promise<{ success: boolean; message: string; count: number }> {
    
    // Try to acquire lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      return {
        success: false,
        message: "Could not acquire cache lock - another update in progress",
        count: 0
      };
    }

    try {
      let finalBounties: BountyItem[] = [];

      if (operation === 'merge') {
        // Get existing data
        const existingData = await redisCache.get("snapshots:latest");
        const existingBounties: BountyItem[] = existingData ? JSON.parse(existingData) : [];
        
        // Merge, filter by date, and deduplicate
        const allBounties = [...existingBounties, ...newBounties];
        const filteredBounties = BountyDeduplicationService.filterByDate(allBounties);
        finalBounties = BountyDeduplicationService.deduplicateBounties(filteredBounties);
      } else {
        // Replace mode - filter by date and deduplicate new bounties
        const filteredBounties = BountyDeduplicationService.filterByDate(newBounties);
        finalBounties = BountyDeduplicationService.deduplicateBounties(filteredBounties);
      }

      // Sort by created_at (most recent first)
      finalBounties.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Limit to prevent cache bloat (keep latest 2000 bounties)
      finalBounties = finalBounties.slice(0, 2000);

      // Update cache
      await Promise.all([
        redisCache.setex("snapshots:latest", ttl, JSON.stringify(finalBounties)),
        redisCache.setex("snapshots:top100", ttl, JSON.stringify(finalBounties.slice(0, 100)))
      ]);

      return {
        success: true,
        message: `Successfully updated cache with ${finalBounties.length} unique bounties`,
        count: finalBounties.length
      };

    } catch (error) {
      console.error("Error updating snapshots cache:", error);
      return {
        success: false,
        message: `Cache update failed: ${error instanceof Error ? error.message : String(error)}`,
        count: 0
      };
    } finally {
      // Always release the lock
      await this.releaseLock();
    }
  }

  /**
   * Get current bounties from cache with deduplication and date filtering
   */
  static async getCurrentBounties(): Promise<BountyItem[]> {
    try {
      const cachedData = await redisCache.get("snapshots:latest");
      if (!cachedData) return [];
      
      const bounties: BountyItem[] = JSON.parse(cachedData);
      
      // Apply date filtering first (exclude pre-2024)
      const filteredByDate = BountyDeduplicationService.filterByDate(bounties);
      
      // Verify no duplicates exist (cleanup if needed)
      const uniqueBounties = BountyDeduplicationService.deduplicateBounties(filteredByDate);
      
      // If filtering or deduplication changed the count, update the cache
      if (uniqueBounties.length !== bounties.length) {
        const removedByDate = bounties.length - filteredByDate.length;
        const removedByDuplication = filteredByDate.length - uniqueBounties.length;
        
        if (removedByDate > 0) {
          console.log(`Filtered out ${removedByDate} bounties from 2024 and earlier`);
        }
        if (removedByDuplication > 0) {
          console.log(`Found ${removedByDuplication} duplicates in cache, cleaning up...`);
        }
        
        await redisCache.setex("snapshots:latest", 1800, JSON.stringify(uniqueBounties));
        await redisCache.setex("snapshots:top100", 1800, JSON.stringify(uniqueBounties.slice(0, 100)));
      }
      
      return uniqueBounties;
    } catch (error) {
      console.error("Error getting current bounties:", error);
      return [];
    }
  }

  /**
   * Remove a specific bounty from cache (for closed/deleted issues)
   */
  static async removeBountyFromCache(bountyId: string | number): Promise<boolean> {
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      console.warn(`Could not acquire lock to remove bounty ${bountyId}`);
      return false;
    }

    try {
      const currentBounties = await this.getCurrentBounties();
      const filteredBounties = currentBounties.filter(b => b.id.toString() !== bountyId.toString());
      
      if (filteredBounties.length !== currentBounties.length) {
        await Promise.all([
          redisCache.setex("snapshots:latest", 1800, JSON.stringify(filteredBounties)),
          redisCache.setex("snapshots:top100", 1800, JSON.stringify(filteredBounties.slice(0, 100)))
        ]);
        console.log(`Removed bounty ${bountyId} from cache`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error removing bounty ${bountyId} from cache:`, error);
      return false;
    } finally {
      await this.releaseLock();
    }
  }
}