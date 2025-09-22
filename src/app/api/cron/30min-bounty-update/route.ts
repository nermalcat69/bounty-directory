import { NextResponse } from "next/server";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath, revalidateTag } from "next/cache";
import { BountyInitializationService } from "@/lib/bounty-initialization-service";
import { BountyDeduplicationService } from "@/lib/bounty-deduplication-service";
import { isSpamIssue, logSpamUserFiltered } from "@/utils/spam-filter";
import { filterIssuesWithDollarLabels } from "@/utils/antiwork-filter";
import { bountyInitializationService } from "@/lib/bounty-initialization-service";

export async function GET() {
  try {
    console.log("Starting 30-minute bounty update...");
    
    // Check if we need to initialize bounty data (when no bounties exist)
    const hasExistingData = await bountyInitializationService.hasBountyData();
    if (!hasExistingData) {
      console.log("No bounty data found, triggering initialization...");
      const initResult = await bountyInitializationService.initializeBountyData();
      
      if (initResult.success) {
        console.log(`Initialization completed: ${initResult.bountyCount} bounties, ${initResult.formattedTotal}`);
        
        // Revalidate pages after initialization
        revalidateTag('bounties');
        revalidateTag('bounty-list');
        revalidateTag('total-bounty-amount');
        revalidateTag('homepage');
        revalidatePath('/');
        revalidatePath('/bounties');
        
        return NextResponse.json({
          success: true,
          message: "Bounty data initialized successfully",
          result: {
            initialized: true,
            totalBounties: initResult.bountyCount,
            totalAmount: initResult.totalAmount,
            formattedTotal: initResult.formattedTotal,
            lastUpdated: initResult.timestamp
          }
        });
      } else {
        console.error("Initialization failed:", initResult.message);
        // Continue with regular update process even if initialization fails
      }
    }
    
    const github = new GitHubAPI(process.env.GITHUB_TOKEN);
    
    // Calculate cutoff date (last 7 days for more frequent updates)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];
    
    // Build search queries for recent activity
    const bountyQuery = `label:"💎 Bounty" state:open updated:>=${cutoffISO}`;
    const dollarQuery = `state:open updated:>=${cutoffISO} "$" in:labels`;
    const antiworkQuery = `org:antiwork is:issue state:open updated:>=${cutoffISO}`;
    
    let allBounties: any[] = [];
    let totalAmount = 0;
    let processed = 0;
    const seenIssues = new Set<number>();
    
    // Get existing cached data to merge with updates
    // This cron job uses ADDITIVE caching - it preserves older entries and only updates/adds new ones
    let existingBounties: any[] = [];
    try {
      const cachedData = await redisCache.get("snapshots:latest");
      if (cachedData) {
        existingBounties = JSON.parse(cachedData);
        console.log(`Found ${existingBounties.length} existing cached bounties for additive update`);
      }
    } catch (error) {
      console.log("No existing cache found, starting fresh");
    }
    
    // Function to process an issue and extract bounty amount
    const processIssue = async (issue: any) => {
      if (seenIssues.has(issue.id)) {
        return;
      }
      seenIssues.add(issue.id);
      
      // Filter out spam users first
      if (isSpamIssue(issue)) {
        logSpamUserFiltered(issue.user.login, issue.id);
        return; // Skip spam issues
      }
      
      // Filter out issues from before 2024 (only show 2024+ issues)
        const issueDate = new Date(issue.created_at);
        const cutoffDate = new Date('2024-01-01T00:00:00.000Z');
        if (issueDate < cutoffDate) {
          console.log(`Filtered issue from ${issueDate.getFullYear()}: ${issue.html_url}`);
          return;
        }
      
      processed++;
      
      // Extract bounty amount from labels
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
        amount: bountyAmount || null,
        raw: issue
      };
      
      allBounties.push(bountyData);
      
      if (bountyAmount) {
        totalAmount += parseBountyAmount(bountyAmount);
      }
    };
    
    // Function to fetch bounties for a query (limited pages for 30min updates)
    const fetchBountiesForQuery = async (query: string, queryType: string) => {
      let page = 1;
      let hasMorePages = true;
      let queryTotal = 0;
      const maxPages = 5; // Limit to 5 pages for 30min updates
      
      console.log(`Starting ${queryType} with query: ${query}`);
      
      while (hasMorePages && page <= maxPages) {
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
    
    // Fetch recent bounty updates
    await fetchBountiesForQuery(bountyQuery, "bounty labels");
    await fetchBountiesForQuery(dollarQuery, "dollar labels");
    await fetchBountiesForQuery(antiworkQuery, "antiwork dollar labels");
    
    // Use the deduplication service to safely merge with existing cache
    const cacheResult = await BountyDeduplicationService.updateSnapshotsCache(
      allBounties, 
      'merge', // Merge with existing data (additive caching)
      1800 // 30 minutes TTL
    );
    
    if (!cacheResult.success) {
      console.error("Failed to update cache:", cacheResult.message);
      return NextResponse.json({
        success: false,
        error: cacheResult.message
      }, { status: 500 });
    }
    
    // Get the final merged bounties for total calculation
    const finalBounties = await BountyDeduplicationService.getCurrentBounties();
    
    // Calculate total amount from all bounties
    let finalTotalAmount = 0;
    let validBountiesCount = 0;
    
    for (const bounty of finalBounties) {
      if (bounty.amount) {
        const amount = parseBountyAmount(bounty.amount);
        if (amount > 0) {
          finalTotalAmount += amount;
          validBountiesCount++;
        }
      }
    }
    
    const formattedTotal = formatBountyAmount(finalTotalAmount);
    const timestamp = new Date().toISOString();
    
    // Cache total bounty amount
    const totalData = {
      amount: finalTotalAmount,
      formatted: formattedTotal,
      lastUpdated: timestamp,
      count: finalBounties.length,
      validBounties: validBountiesCount
    };
    await redisCache.setex("bounty:total", 1800, JSON.stringify(totalData));
    
    // Revalidate ISR pages and tags
    revalidateTag('bounties');
    revalidateTag('bounty-list');
    revalidateTag('total-bounty-amount');
    revalidateTag('homepage');
    revalidatePath('/');
    revalidatePath('/bounties');
    
    console.log(`30-minute bounty update complete: ${processed} new/updated bounties, total: ${formattedTotal}`);
    
    return NextResponse.json({
      success: true,
      message: "30-minute bounty update completed successfully",
      result: {
        newOrUpdated: processed,
        totalBounties: finalBounties.length,
        totalAmount: finalTotalAmount,
        formattedTotal,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in 30-minute bounty update:", error);
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