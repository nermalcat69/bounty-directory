import { NextResponse } from "next/server";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { revalidatePath, revalidateTag } from "next/cache";
import { filterIssuesWithDollarLabels } from "@/utils/antiwork-filter";
import { isSpamIssue, logSpamUserFiltered } from "@/utils/spam-filter";

export async function GET() {
  try {
    console.log("🚀 Starting daily bounty update...");
    
    // Get existing data from PostgreSQL cache
    const existingSnapshotsData = await redisCache.get("snapshots:latest");
    const existingBounties = existingSnapshotsData ? JSON.parse(existingSnapshotsData) : [];
    
    const allBounties: any[] = [];
    const github = new GitHubAPI();
    
    // Process a single issue and add to allBounties
    const processIssue = async (issue: any) => {
      // Skip spam issues
      if (isSpamIssue(issue)) {
        logSpamUserFiltered(issue.user.login, issue.html_url);
        return;
      }
      
      // Extract bounty amount from labels
      let bountyAmount = "";
      for (const label of issue.labels) {
        if (label.name.includes("$") || label.name.toLowerCase().includes("bounty")) {
          bountyAmount = label.name;
          break;
        }
      }
      
      // Get repository language
      const language = await extractLanguageFromRepository(github, issue.repository_url);
      
      // Create bounty object
      const bounty = {
        id: issue.id,
        title: issue.title,
        html_url: issue.html_url,
        repo: issue.repository_url.replace("https://api.github.com/repos/", ""),
        user_login: issue.user.login,
        user_avatar_url: issue.user.avatar_url,
        amount: bountyAmount,
        language: language || "Unknown",
        labels: issue.labels.map((label: any) => ({
          name: label.name,
          color: label.color
        })),
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        body: issue.body?.substring(0, 500) || "",
        assignee: issue.assignee?.login || null,
        milestone: issue.milestone?.title || null,
        comments: issue.comments || 0
      };
      
      allBounties.push(bounty);
    };
    
    // Comprehensive GitHub search queries for daily update
    const queries = [
      // Main bounty label search
      {
        query: 'label:"💎 Bounty" state:open is:issue',
        type: "bounty labels",
        pages: 10 // More comprehensive for daily update
      },
      // Dollar sign searches
      {
        query: 'state:open "$" in:labels is:issue',
        type: "dollar labels",
        pages: 5
      },
      // Bounty keyword searches
      {
        query: 'state:open "bounty" in:labels is:issue',
        type: "bounty keyword",
        pages: 5
      },
      // Prize and reward searches
      {
        query: 'state:open "prize" in:labels is:issue',
        type: "prize labels",
        pages: 3
      },
      {
        query: 'state:open "reward" in:labels is:issue',
        type: "reward labels",
        pages: 3
      },
      // Antiwork organization (comprehensive)
      {
        query: 'org:antiwork is:issue state:open',
        type: "antiwork issues",
        pages: 10,
        filter: true // Apply dollar label filter
      },
      // Gitcoin and other bounty platforms
      {
        query: 'state:open "gitcoin" in:labels is:issue',
        type: "gitcoin labels",
        pages: 3
      },
      // Hackathon bounties
      {
        query: 'state:open "hackathon" in:labels is:issue',
        type: "hackathon labels",
        pages: 3
      }
    ];
    
    // Function to fetch bounties for a specific query
    const fetchBountiesForQuery = async (searchQuery: string, queryType: string, maxPages: number = 5, applyFilter: boolean = false) => {
      let page = 1;
      let hasMorePages = true;
      let queryTotal = 0;
      
      while (hasMorePages && page <= maxPages) {
        console.log(`Fetching ${queryType} page ${page}...`);
        
        const response = await github.searchIssues(searchQuery, page);
        let issues = response.data.items;
        
        // Apply antiwork filter if needed
        if (applyFilter) {
          const originalCount = issues.length;
          issues = filterIssuesWithDollarLabels(issues);
          console.log(`Filtered ${queryType}: ${originalCount} -> ${issues.length} (with $ labels)`);
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
    
    // Execute all queries
    for (const queryConfig of queries) {
      await fetchBountiesForQuery(
        queryConfig.query, 
        queryConfig.type, 
        queryConfig.pages, 
        queryConfig.filter || false
      );
    }
    
    // Remove duplicates by ID
    const uniqueBounties = Array.from(
      new Map(allBounties.map(bounty => [bounty.id, bounty])).values()
    );
    
    // Merge with existing data, removing duplicates and updating existing entries
    const existingBountiesMap = new Map(existingBounties.map((b: any) => [b.id, b]));
    
    // Update existing bounties with new data
    for (const newBounty of uniqueBounties) {
      existingBountiesMap.set(newBounty.id, newBounty);
    }
    
    // Convert back to array and sort by updated_at (most recent first)
    const mergedBounties = Array.from(existingBountiesMap.values())
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    // Calculate total amount from all bounties
    let finalTotalAmount = 0;
    let validBountiesCount = 0;
    
    for (const bounty of mergedBounties) {
      if ((bounty as any).amount) {
        const amount = parseBountyAmount((bounty as any).amount);
        if (amount > 0) {
          finalTotalAmount += amount;
          validBountiesCount++;
        }
      }
    }
    
    const formattedTotal = formatBountyAmount(finalTotalAmount);
    const timestamp = new Date().toISOString();
    
    // Cache the comprehensive results with longer expiration (24 hours)
    await redisCache.setex("snapshots:latest", 86400, JSON.stringify(mergedBounties));
        await redisCache.setex("snapshots:top100", 86400, JSON.stringify(mergedBounties.slice(0, 100)));
    
    // Cache total bounty amount
    const totalData = {
      amount: finalTotalAmount,
      formatted: formattedTotal,
      lastUpdated: timestamp,
      count: mergedBounties.length,
      validBounties: validBountiesCount
    };
    await redisCache.setex("bounty:total", 86400, JSON.stringify(totalData));
    
    // Revalidate ISR cache
    revalidateTag("bounties");
    revalidateTag("bounty-totals");
    revalidatePath("/");
    revalidatePath("/bounties");
    
    console.log(`Daily bounty update complete: ${uniqueBounties.length} new/updated bounties, total: ${formattedTotal}`);
    
    return NextResponse.json({
      success: true,
      message: "Daily bounty update completed successfully",
      result: {
        newOrUpdated: uniqueBounties.length,
        totalBounties: mergedBounties.length,
        validBounties: validBountiesCount,
        totalAmount: finalTotalAmount,
        formattedTotal,
        lastUpdated: timestamp
      }
    });
    
  } catch (error) {
    console.error("Daily bounty update error:", error);
    return NextResponse.json(
      { success: false, error: "Daily bounty update failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}