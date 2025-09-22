import { NextResponse } from "next/server";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath, revalidateTag } from "next/cache";
import { isSpamIssue, logSpamUserFiltered } from "@/utils/spam-filter";
import { BountyDeduplicationService } from "@/lib/bounty-deduplication-service";

export async function GET() {
  try {
    console.log("🚀 Starting hourly total bounty update...");
    
    // Verify this is a legitimate cron request
    const authHeader = process.env.CRON_SECRET;
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    
    // Use existing cache data instead of fetching new data to prevent conflicts
    // This job focuses only on recalculating totals from cached bounties
    const currentBounties = await BountyDeduplicationService.getCurrentBounties();
    
    if (currentBounties.length === 0) {
      console.log("No bounties found in cache, skipping total calculation");
      return NextResponse.json({
        success: true,
        message: "No bounties in cache to calculate totals from",
        result: {
          totalAmount: 0,
          formattedTotal: "$0",
          count: 0,
          lastUpdated: new Date().toISOString()
        }
      });
    }
    
    let totalAmount = 0;
    let validBountiesCount = 0;
    const seenIssues = new Set<number>();
    
    // Calculate totals from cached bounties
    for (const bounty of currentBounties) {
      // Skip duplicates (shouldn't happen with deduplication service, but safety check)
      if (seenIssues.has(Number(bounty.id))) {
        continue;
      }
      
      seenIssues.add(Number(bounty.id));
      
      if (bounty.amount) {
        const amount = parseBountyAmount(bounty.amount);
        if (amount > 0) {
          totalAmount += amount;
          validBountiesCount++;
        }
      }
    }
    
    const formattedTotal = formatBountyAmount(totalAmount);
    const timestamp = new Date().toISOString();
    
    // Update Redis with the total amount (24-hour expiration)
    const totalData = {
      amount: totalAmount,
      formatted: formattedTotal,
      lastUpdated: timestamp,
      count: currentBounties.length,
      validBounties: validBountiesCount
    };
    await redisCache.setex("bounty:total", 86400, JSON.stringify(totalData));
    
    // Revalidate ISR pages and tags
    revalidateTag("bounty-totals");
    revalidateTag("homepage");
    revalidatePath("/");
    
    console.log(`Hourly total update complete: ${formattedTotal} from ${validBountiesCount}/${currentBounties.length} bounties`);
    
    return NextResponse.json({
      success: true,
      message: "Hourly total update completed successfully",
      result: {
        totalAmount,
        formattedTotal,
        count: currentBounties.length,
        validBounties: validBountiesCount,
        lastUpdated: timestamp
      }
    });
    
  } catch (error) {
    console.error("Hourly total update error:", error);
    return NextResponse.json(
      { success: false, error: "Hourly total update failed" },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST() {
  return GET();
}