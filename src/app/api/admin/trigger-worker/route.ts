import { NextResponse } from "next/server";
import { bountyInitializationService } from "@/lib/bounty-initialization-service";

export async function POST() {
  try {
    console.log("Manually triggering bounty initialization...");
    
    const result = await bountyInitializationService.initializeBountyData();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      result: {
        bountyCount: result.bountyCount,
        totalAmount: result.formattedTotal,
        timestamp: result.timestamp
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error triggering bounty worker:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}