import { NextResponse } from "next/server";
import { bountyInitializationService } from "@/lib/bounty-initialization-service";
import { revalidateTag, revalidatePath } from "next/cache";
import { redisCache } from "@/lib/redis-cache";

/**
 * Manual bounty data refresh endpoint
 * This endpoint allows manual triggering of bounty data refresh and initialization
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication/authorization here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.REFRESH_API_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log("Manual bounty refresh triggered");

    // Parse request body for options
    let options = {};
    try {
      const body = await request.text();
      if (body) {
        options = JSON.parse(body);
      }
    } catch (error) {
      // Ignore JSON parsing errors, use default options
    }

    const { force = false, clearCache = false } = options as { force?: boolean; clearCache?: boolean };

    // Clear cache if requested
    if (clearCache) {
      console.log("Clearing existing cache...");
      await redisCache.del("snapshots:latest");
      await redisCache.del("snapshots:top100");
      await redisCache.del("bounty:total");
    }

    // Check if we need to initialize or if force refresh is requested
    const hasData = await bountyInitializationService.hasBountyData();
    
    if (!hasData || force) {
      console.log(force ? "Force refresh requested" : "No bounty data found, initializing...");
      
      const initResult = await bountyInitializationService.initializeBountyData();
      
      if (initResult.success) {
        // Revalidate all relevant caches and pages
        console.log("Revalidating caches and pages...");
        
        // Revalidate ISR pages and tags
        revalidateTag('bounties');
        revalidateTag('bounty-list');
        revalidateTag('bounty-snapshot');
        revalidateTag('bounty-totals');
        revalidateTag('total-bounty-amount');
        revalidateTag('total-bounty-amount-string');
        revalidateTag('homepage');
        
        // Revalidate specific paths
        revalidatePath('/');
        revalidatePath('/bounties');
        
        console.log(`Manual refresh completed: ${initResult.bountyCount} bounties, ${initResult.formattedTotal}`);
        
        return NextResponse.json({
          success: true,
          message: "Bounty data refreshed successfully",
          result: {
            action: force ? "force_refresh" : "initialization",
            bountyCount: initResult.bountyCount,
            totalAmount: initResult.totalAmount,
            formattedTotal: initResult.formattedTotal,
            timestamp: initResult.timestamp,
            cacheCleared: clearCache
          }
        });
      } else {
        console.error("Manual refresh failed:", initResult.message);
        
        return NextResponse.json({
          success: false,
          message: "Failed to refresh bounty data",
          error: initResult.message,
          result: {
            action: force ? "force_refresh" : "initialization",
            bountyCount: 0,
            totalAmount: 0,
            formattedTotal: "$0",
            timestamp: initResult.timestamp,
            cacheCleared: clearCache
          }
        }, { status: 500 });
      }
    } else {
      console.log("Bounty data already exists and no force refresh requested");
      
      // Get current data for response
      const cachedData = await redisCache.get("snapshots:latest");
      const totalData = await redisCache.get("bounty:total");
      
      let bountyCount = 0;
      let totalAmount = 0;
      let formattedTotal = "$0";
      
      if (cachedData) {
        try {
          const bounties = JSON.parse(cachedData);
          bountyCount = Array.isArray(bounties) ? bounties.length : 0;
        } catch (error) {
          console.error("Error parsing cached bounties:", error);
        }
      }
      
      if (totalData) {
        try {
          const total = JSON.parse(totalData);
          totalAmount = total.amount || 0;
          formattedTotal = total.formatted || "$0";
        } catch (error) {
          console.error("Error parsing cached total:", error);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: "Bounty data already exists",
        result: {
          action: "no_action_needed",
          bountyCount,
          totalAmount,
          formattedTotal,
          timestamp: new Date().toISOString(),
          cacheCleared: false
        }
      });
    }

  } catch (error) {
    console.error("Error in manual bounty refresh:", error);
    
    return NextResponse.json({
      success: false,
      message: "Internal server error during bounty refresh",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check current bounty data status
 */
export async function GET() {
  try {
    const hasData = await bountyInitializationService.hasBountyData();
    
    // Get current data for response
    const cachedData = await redisCache.get("snapshots:latest");
    const totalData = await redisCache.get("bounty:total");
    
    let bountyCount = 0;
    let totalAmount = 0;
    let formattedTotal = "$0";
    let lastUpdated = null;
    
    if (cachedData) {
      try {
        const bounties = JSON.parse(cachedData);
        bountyCount = Array.isArray(bounties) ? bounties.length : 0;
      } catch (error) {
        console.error("Error parsing cached bounties:", error);
      }
    }
    
    if (totalData) {
      try {
        const total = JSON.parse(totalData);
        totalAmount = total.amount || 0;
        formattedTotal = total.formatted || "$0";
        lastUpdated = total.lastUpdated || null;
      } catch (error) {
        console.error("Error parsing cached total:", error);
      }
    }
    
    return NextResponse.json({
      success: true,
      status: {
        hasData,
        bountyCount,
        totalAmount,
        formattedTotal,
        lastUpdated,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Error checking bounty data status:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}