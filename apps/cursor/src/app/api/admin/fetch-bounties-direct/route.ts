import { NextResponse } from "next/server";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";

export async function POST() {
  try {
    console.log("Fetching bounties directly from GitHub API...");
    
    const github = new GitHubAPI(process.env.GITHUB_TOKEN);
    
    // Calculate cutoff date (365 days ago to get more bounties)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];
    
    // Build search query - include both bounty labels and dollar amount labels
    const bountyQuery = `label:"💎 Bounty" state:open created:>=${cutoffISO}`;
    const dollarQuery = `state:open created:>=${cutoffISO} "$" in:labels`;
    const antiworkQuery = `org:antiwork state:open created:>=${cutoffISO}`;
    
    let allBounties: any[] = [];
    let totalAmount = 0;
    let processed = 0;
    const seenIssues = new Set<number>(); // To avoid duplicates between queries
    
    // Function to process an issue and extract bounty amount
    const processIssue = async (issue: any) => {
      // Skip if we've already seen this issue
      if (seenIssues.has(issue.id)) {
        return;
      }
      seenIssues.add(issue.id);
      
      processed++;
      
      // Convert to our snapshot format
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
      
      // Calculate bounty amount for this issue
      let bountyAmount = null;
      
      for (const label of issue.labels) {
        const labelName = label.name;
        
        // Look for various patterns in labels
        const priorityPatterns = [
          /\$(\d+(?:\.\d+)?[km]?)/i,    // $100, $2k, $1.5m
          /(\d+(?:\.\d+)?[km]?)\s*usd/i, // 100 USD, 2k USD
          /(\d+(?:\.\d+)?[km]?)\s*dollars?/i, // 100 dollar(s)
          /bounty[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i, // bounty: $100
          /reward[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i, // reward: $100
          /prize[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i   // prize: $100
        ];
        
        // Check priority patterns first
        for (const pattern of priorityPatterns) {
          const match = labelName.match(pattern);
          if (match) {
            bountyAmount = `$${match[1]}`;
            break;
          }
        }
        
        // If no priority pattern found, extract any number with suffix
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
    
    // Function to fetch bounties for a given query
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
        
        // If we got less than 100 results, we're done
        if (response.data.items.length < 100) {
          hasMorePages = false;
        }
        
        // Check rate limit
        if (response.rateLimit.remaining < 10) {
          console.log("Rate limit low, stopping...");
          hasMorePages = false;
        }
        
        page++;
      }
    };
    
    // Fetch bounties with explicit bounty labels
    await fetchBountiesForQuery(bountyQuery, "bounty labels");
    
    // Fetch bounties with dollar amount labels
    await fetchBountiesForQuery(dollarQuery, "dollar labels");
    
    // Fetch issues from antiwork organization
    await fetchBountiesForQuery(antiworkQuery, "antiwork organization");
    
    // Cache the results in Redis
    await redis.setex("snapshots:latest", 3600, JSON.stringify(allBounties));
    await redis.setex("snapshots:top100", 3600, JSON.stringify(allBounties.slice(0, 100)))
    
    const formattedTotal = formatBountyAmount(totalAmount);
    
    console.log(`Fetch complete: ${processed} bounties processed, total amount: ${formattedTotal}`);
    
    return NextResponse.json({
      success: true,
      message: "Bounties fetched and cached successfully",
      result: {
        processed,
        totalAmount,
        formattedTotal,
        cached: allBounties.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching bounties directly:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}