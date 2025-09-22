import { NextResponse } from "next/server";
import { BountyDeduplicationService } from "@/lib/bounty-deduplication-service";
import { redisCache } from "@/lib/redis-cache";

export async function POST() {
  try {
    console.log("🧹 Starting cache cleanup...");
    
    // Get current bounties and check for duplicates
    const currentBounties = await BountyDeduplicationService.getCurrentBounties();
    const originalCount = currentBounties.length;
    
    // Force deduplication by replacing the cache
    const cleanupResult = await BountyDeduplicationService.updateSnapshotsCache(
      currentBounties, 
      'replace', // Replace mode to force deduplication
      1800 // 30 minutes TTL
    );
    
    if (!cleanupResult.success) {
      return NextResponse.json({
        success: false,
        error: cleanupResult.message
      }, { status: 500 });
    }
    
    // Get the cleaned bounties count
    const cleanedBounties = await BountyDeduplicationService.getCurrentBounties();
    const finalCount = cleanedBounties.length;
    const duplicatesRemoved = originalCount - finalCount;
    
    // Also clean up any orphaned cache keys
    const keysToCheck = [
      'bounty:cache:lock',
      'bounties:latest' // Old cache key that might exist
    ];
    
    let orphanedKeysRemoved = 0;
    for (const key of keysToCheck) {
      try {
        const exists = await redisCache.get(key);
        if (exists) {
          await redisCache.del(key);
          orphanedKeysRemoved++;
          console.log(`Removed orphaned cache key: ${key}`);
        }
      } catch (error) {
        console.warn(`Could not check/remove key ${key}:`, error);
      }
    }
    
    console.log(`Cache cleanup complete: removed ${duplicatesRemoved} duplicates and ${orphanedKeysRemoved} orphaned keys`);
    
    return NextResponse.json({
      success: true,
      message: "Cache cleanup completed successfully",
      result: {
        originalCount,
        finalCount,
        duplicatesRemoved,
        orphanedKeysRemoved,
        cleanupTimestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Cache cleanup error:", error);
    return NextResponse.json({
      success: false,
      error: `Cache cleanup failed: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just return current cache statistics without cleaning
    const currentBounties = await BountyDeduplicationService.getCurrentBounties();
    
    // Check for potential duplicates
    const idCounts = new Map<string, number>();
    for (const bounty of currentBounties) {
      const id = bounty.id.toString();
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
    
    const duplicateIds = Array.from(idCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalBounties: currentBounties.length,
        uniqueIds: idCounts.size,
        duplicateIds: duplicateIds.length,
        duplicates: duplicateIds,
        lastChecked: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Cache statistics error:", error);
    return NextResponse.json({
      success: false,
      error: `Failed to get cache statistics: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}