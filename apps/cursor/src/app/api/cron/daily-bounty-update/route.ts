import { NextResponse } from "next/server";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    // Verify this is a legitimate cron request (you can add auth headers here)
    const authHeader = process.env.CRON_SECRET;
    
    console.log("Starting daily bounty update...");
    
    const github = new GitHubAPI(process.env.GITHUB_TOKEN);
    
    // Calculate cutoff date (365 days ago to get comprehensive data)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];
    
    // Build search queries
    const bountyQuery = `label:"💎 Bounty" state:open created:>=${cutoffISO}`;
    const dollarQuery = `state:open created:>=${cutoffISO} "$" in:labels`;
    const antiworkQuery = `org:antiwork state:open created:>=${cutoffISO}`;
    
    let allBounties: any[] = [];
    let totalAmount = 0;
    let processed = 0;
    const seenIssues = new Set<number>();
    
    // Function to process an issue and extract bounty amount
    const processIssue = async (issue: any) => {
      if (seenIssues.has(issue.id)) {
        return;
      }
      seenIssues.add(issue.id);
      
      processed++;
      
      const bountyData = {
        id: issue.id.toString(),
        repo: issue.repository_url.split('/').slice(-2).join('/'),
        number: issue.number,
        title: issue.title,
        body: issue.body,
        html_url: issue.html_url,
        user_login: issue.user.login,
        created_at: new Date(issue.created_at),
        updated_at: new Date(issue.updated_at),
        labels: JSON.stringify(issue.labels.map((l: any) => l.name)),
        comments: issue.comments,
        state: issue.state,
        assignee: issue.assignee?.login || null,
        language: await extractLanguageFromRepository(github, issue.repository_url)
      };
      
      allBounties.push(bountyData);
      
      // Extract bounty amount
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
    
    // Function to fetch bounties for a query
    const fetchBountiesForQuery = async (query: string, queryType: string) => {
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        console.log(`Fetching ${queryType} page ${page}...`);
        
        const response = await github.searchIssues(query, page, 100);
        
        if (!response.data.items || response.data.items.length === 0) {
          hasMorePages = false;
          break;
        }
        
        for (const issue of response.data.items) {
          await processIssue(issue);
        }
        
        if (response.data.items.length < 100) {
          hasMorePages = false;
        }
        
        if (response.rateLimit.remaining < 10) {
          console.log("Rate limit low, stopping...");
          hasMorePages = false;
        }
        
        page++;
      }
    };
    
    // Fetch all types of bounties
    await fetchBountiesForQuery(bountyQuery, "bounty labels");
    await fetchBountiesForQuery(dollarQuery, "dollar labels");
    await fetchBountiesForQuery(antiworkQuery, "antiwork organization");
    
    // Cache the results in Redis with longer expiration (24 hours)
    await redis.setex("snapshots:latest", 86400, JSON.stringify(allBounties));
    await redis.setex("snapshots:top100", 86400, JSON.stringify(allBounties.slice(0, 100)));
    
    // Cache the total amount separately for quick access
    const formattedTotal = formatBountyAmount(totalAmount);
    await redis.setex("bounty:total", 86400, JSON.stringify({
      amount: totalAmount,
      formatted: formattedTotal,
      lastUpdated: new Date().toISOString(),
      count: processed
    }));
    
    // Revalidate the homepage to use fresh data
    revalidatePath('/');
    
    console.log(`Daily bounty update complete: ${processed} bounties, total: ${formattedTotal}`);
    
    return NextResponse.json({
      success: true,
      message: "Daily bounty update completed successfully",
      result: {
        processed,
        totalAmount,
        formattedTotal,
        cached: allBounties.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in daily bounty update:", error);
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