import { NextResponse } from "next/server";
import { BountyFetcher } from "@/lib/bounty-fetcher";

export async function POST() {
  try {
    console.log("Manually triggering bounty worker...");
    
    const fetcher = new BountyFetcher(process.env.GITHUB_TOKEN);
    const result = await fetcher.fetchAndUpdateBounties();
    
    return NextResponse.json({
      success: true,
      message: "Bounty worker completed successfully",
      result: {
        processed: result.processed,
        newIssues: result.newIssues,
        rateLimit: result.rateLimit
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