import { redisCache } from "@/lib/redis-cache";

export async function GET() {
  try {
    console.log("🔄 Starting hard refresh cron job...");
    
    // Clear ALL cache keys
    const cacheKeys = [
      "snapshots:latest",
      "snapshots:top100", 
      "bounty:total",
      "bounties:latest"
    ];
    
    // Clear Redis cache
    for (const key of cacheKeys) {
      await redisCache.del(key);
      console.log(`🗑️ Cleared cache key: ${key}`);
    }
    
    // Clear common language/repo specific totals (known patterns)
    const additionalKeys = [
      "bounty:total:language:javascript",
      "bounty:total:language:python", 
      "bounty:total:language:typescript",
      "bounty:total:language:rust",
      "bounty:total:language:go",
      "bounty:total:language:java",
      "bounty:total:repo:antiwork"
    ];
    
    let additionalCleared = 0;
    for (const key of additionalKeys) {
      const result = await redisCache.del(key);
      if (result > 0) {
        additionalCleared++;
        console.log(`🗑️ Cleared cache key: ${key}`);
      }
    }
    
    console.log("✅ Hard refresh completed - all cache cleared");
    
    return Response.json({
      success: true,
      message: "Hard refresh completed successfully",
      result: {
        clearedKeys: cacheKeys.length + additionalCleared,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ Hard refresh error:", error);
    return Response.json(
      { success: false, error: "Hard refresh failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}