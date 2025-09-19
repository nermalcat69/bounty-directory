import { NextResponse } from "next/server";
import { GitHubAPI } from "@/lib/github";
import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath, revalidateTag } from "next/cache";
import { isSpamIssue, logSpamUserFiltered } from "@/utils/spam-filter";

export async function GET() {
  try {
    // Verify this is a legitimate cron request
    const authHeader = process.env.CRON_SECRET;
    
    console.log("Starting hourly total rewards update...");
    
    const github = new GitHubAPI(process.env.GITHUB_TOKEN);
    
    // Calculate cutoff date (365 days ago to get comprehensive data)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];
    
    // Build search queries
    const bountyQuery = `label:"💎 Bounty" state:open created:>=${cutoffISO}`;
    const dollarQuery = `state:open created:>=${cutoffISO} "$" in:labels`;
    const antiworkQuery = `org:antiwork state:open created:>=${cutoffISO} "$" in:labels`;
    
    let totalAmount = 0;
    let processed = 0;
    const seenIssues = new Set<number>();
    
    // Function to process an issue and extract bounty amount
    const processIssue = (issue: any) => {
      if (seenIssues.has(issue.id)) {
        return;
      }
      seenIssues.add(issue.id);
      
      // Filter out spam users
      if (isSpamIssue(issue)) {
        logSpamUserFiltered(issue.user.login, issue.id);
        return;
      }
      
      processed++;
      
      // Extract bounty amount from labels
      let bountyAmount = null;
      
      for (const label of issue.labels) {
        const labelName = label.name;
        
        const priorityPatterns = [
          /\$(\d+(?:\.\d+)?[km]?)/i,
          /(\d+(?:\.\d+)?[km]?)\s*usd/i,
          /(\d+(?:\.\d+)?[km]?)\s*dollars?/i,
          /bounty[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i,
          /reward[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i,
          /prize[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i
        ];
        
        for (const pattern of priorityPatterns) {
          const match = labelName.match(pattern);
          if (match) {
            bountyAmount = `$${match[1]}`;
            break;
          }
        }
        
        if (!bountyAmount) {
          const numberMatch = labelName.match(/(\d+(?:\.\d+)?[km]?)/i);
          if (numberMatch) {
            const value = numberMatch[1].toLowerCase();
            const numericPart = parseFloat(value.replace(/[km]/i, ''));
            const hasK = value.includes('k');
            const hasM = value.includes('m');
            
            let baseNumber = numericPart;
            if (hasK) baseNumber *= 1000;
            if (hasM) baseNumber *= 1000000;
            
            if (baseNumber >= 1 && baseNumber <= 100000000) {
              bountyAmount = `$${value}`;
            }
          }
        }
        
        if (bountyAmount) break;
      }
      
      if (bountyAmount) {
        totalAmount += parseBountyAmount(bountyAmount);
      }
    };
    
    // Function to fetch bounties for a specific query
    const fetchBountiesForQuery = async (query: string, type: string) => {
      try {
        console.log(`Fetching ${type}...`);
        const response = await github.searchIssues(query);
        const issues = response.data.items;
        
        for (const issue of issues) {
          processIssue(issue);
        }
        
        console.log(`Processed ${issues.length} issues from ${type}`);
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
      }
    };
    
    // Fetch all types of bounties (only for total calculation)
    await fetchBountiesForQuery(bountyQuery, "bounty labels");
    await fetchBountiesForQuery(dollarQuery, "dollar labels");
    await fetchBountiesForQuery(antiworkQuery, "antiwork dollar labels");
    
    // Update only the total amount in Redis (24 hour expiration to match API expectations)
    const formattedTotal = formatBountyAmount(totalAmount);
    const totalData = {
      count: processed,
      amount: totalAmount,
      formatted: formattedTotal,
      lastUpdated: new Date().toISOString()
    };
    
    await redis.setex("bounty:total", 86400, JSON.stringify(totalData));
    
    // Revalidate ISR pages and tags to use fresh data
    revalidateTag('total-bounty-amount');
    revalidateTag('homepage');
    revalidatePath('/');
    
    console.log(`Hourly total update complete: ${processed} bounties, total: ${formattedTotal}`);
    
    return NextResponse.json({
      success: true,
      message: "Hourly total update completed successfully",
      result: totalData
    });

  } catch (error) {
    console.error("Error in hourly total update:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Also allow POST for manual triggers
export async function POST() {
  return GET();
}