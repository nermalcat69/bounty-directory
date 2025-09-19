import { NextResponse } from "next/server";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath, revalidateTag } from "next/cache";
import { filterIssuesWithDollarLabels } from "@/utils/antiwork-filter";

export async function GET() {
  try {
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
    const antiworkQuery = `org:antiwork is:issue state:open`; // Broader search, filter labels in code
    
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
      
      // Extract bounty amount from labels first
      let bountyAmount = '';
      for (const label of issue.labels) {
        const labelName = label.name.toLowerCase();
        
        if (labelName.includes('bounty') && labelName.includes('$')) {
          const match = labelName.match(/\$(\d+(?:\.\d+)?[km]?)/i);
          if (match) {
            bountyAmount = `$${match[1]}`;
            break;
          }
        }
        
        if (labelName.startsWith('$')) {
          bountyAmount = label.name;
          break;
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

      const bountyData = {
        id: issue.id,
        title: issue.title,
        html_url: issue.html_url,
        repo: issue.repository_url.split('/').slice(-2).join('/'),
        user_login: issue.user.login,
        user_avatar_url: issue.user.avatar_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        comments: issue.comments,
        labels: issue.labels.map((label: any) => ({
          name: label.name,
          color: label.color
        })),
        language: await extractLanguageFromRepository(github, issue.repository_url),
        amount: bountyAmount || null, // Add the bounty amount to the data
        raw: issue
      };
      
      allBounties.push(bountyData);
      
      if (bountyAmount) {
        totalAmount += parseBountyAmount(bountyAmount);
      }
    };
    
    // Function to fetch bounties for a query
    const fetchBountiesForQuery = async (query: string, queryType: string) => {
      let page = 1;
      let hasMorePages = true;
      let queryTotal = 0;
      
      console.log(`Starting ${queryType} with query: ${query}`);
      
      while (hasMorePages) {
        console.log(`Fetching ${queryType} page ${page}...`);
        
        const response = await github.searchIssues(query, page, 100);
        
        let issues = response.data.items || [];
        
        // Special filtering for antiwork queries
        if (queryType === "antiwork dollar labels") {
          const originalCount = issues.length;
          issues = filterIssuesWithDollarLabels(issues);
          console.log(`Filtered antiwork issues: ${originalCount} -> ${issues.length} (with $ labels)`);
        }
        
        if (!issues || issues.length === 0) {
          if (queryType === "antiwork dollar labels" && response.data.items.length > 0) {
            console.log(`No antiwork issues with $ labels found on page ${page}`);
          }
          if (response.data.items.length === 0) {
            hasMorePages = false;
            break;
          }
        }
        
        queryTotal += issues.length;
        console.log(`Found ${issues.length} issues on page ${page} for ${queryType}`);
        
        for (const issue of issues) {
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
      
      console.log(`Completed ${queryType}: found ${queryTotal} total issues`);
    };
    
    // Fetch all types of bounties
    await fetchBountiesForQuery(bountyQuery, "bounty labels");
    await fetchBountiesForQuery(dollarQuery, "dollar labels");
    await fetchBountiesForQuery(antiworkQuery, "antiwork dollar labels");
    
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
    
    // Revalidate all ISR pages and tags to use fresh data
    revalidateTag('bounties');
    revalidateTag('bounty-list');
    revalidateTag('total-bounty-amount');
    revalidateTag('homepage');
    revalidatePath('/');
    revalidatePath('/bounties');
    
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