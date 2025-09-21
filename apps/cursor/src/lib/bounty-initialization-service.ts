import { redisCache } from "@/lib/redis-cache";
import { GitHubAPI, extractLanguageFromRepository } from "@/lib/github";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { filterIssuesWithDollarLabels } from "@/utils/antiwork-filter";
import { isSpamIssue } from "@/utils/spam-filter";
import { extractBountyAmount } from "@/utils/bounty-extractor";

interface BountyInitializationResult {
  success: boolean;
  message: string;
  bountyCount: number;
  totalAmount: number;
  formattedTotal: string;
  timestamp: string;
}

/**
 * Service to initialize bounty data when no bounties are found in cache
 * This ensures the application always has data to display
 */
export class BountyInitializationService {
  private github: GitHubAPI;

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
    this.github = new GitHubAPI(process.env.GITHUB_TOKEN);
  }

  /**
   * Check if bounty data exists in cache
   */
  async hasBountyData(): Promise<boolean> {
    try {
      const cachedData = await redisCache.get("snapshots:latest");
      if (!cachedData) return false;
      
      const bounties = JSON.parse(cachedData);
      return Array.isArray(bounties) && bounties.length > 0;
    } catch (error) {
      console.error("Error checking bounty data:", error);
      return false;
    }
  }

  /**
   * Initialize bounty data by fetching from GitHub
   */
  async initializeBountyData(): Promise<BountyInitializationResult> {
    console.log("🚀 Starting bounty data initialization...");
    
    try {
      // Build comprehensive search queries
      const bountyQuery = `label:"💎 Bounty" state:open`;
      const dollarQuery = `state:open "$" in:labels`;
      const antiworkQuery = `org:antiwork is:issue state:open`;
      
      let allBounties: any[] = [];
      let totalAmount = 0;
      let processed = 0;
      const seenIssues = new Set<number>();

      // Function to process an issue and extract bounty amount
      const processIssue = async (issue: any) => {
        if (seenIssues.has(issue.id)) return;
        seenIssues.add(issue.id);

        // Filter out spam users
        if (isSpamIssue(issue)) {
          console.log(`Filtered spam issue: ${issue.html_url}`);
          return;
        }

        // Extract bounty amount from labels
        let bountyAmount = null;
        for (const label of issue.labels || []) {
          const labelName = label.name;
          
          // Priority patterns for bounty detection
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
          
          if (bountyAmount) break;
        }

        // Extract language from repository
        const language = await extractLanguageFromRepository(this.github, issue.repository_url);

        const bountyItem = {
          id: issue.id.toString(),
          repo: issue.repository_url.split('/').slice(-2).join('/'),
          number: issue.number,
          title: issue.title,
          body: issue.body,
          html_url: issue.html_url,
          user_login: issue.user.login,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          labels: JSON.stringify(issue.labels?.map((l: any) => l.name) || []),
          comments: issue.comments,
          state: issue.state,
          assignee: issue.assignee?.login || null,
          language,
          amount: bountyAmount
        };

        allBounties.push(bountyItem);
        
        if (bountyAmount) {
          totalAmount += parseBountyAmount(bountyAmount);
        }
        
        processed++;
      };

      // Function to fetch bounties for a specific query
      const fetchBountiesForQuery = async (query: string, description: string) => {
        console.log(`Fetching bounties for ${description}...`);
        
        try {
          let page = 1;
          let hasMore = true;
          
          while (hasMore && page <= 50) { // Increased limit to fetch more bounties
            const response = await this.github.searchIssues(query, page, 100);
            const issues = response.data.items;
            
            if (!issues || issues.length === 0) {
              hasMore = false;
              break;
            }

            // Process antiwork issues with special filtering
            if (description.includes("antiwork")) {
              const filteredIssues = filterIssuesWithDollarLabels(issues);
              for (const issue of filteredIssues) {
                await processIssue(issue);
              }
            } else {
              for (const issue of issues) {
                await processIssue(issue);
              }
            }
            
            console.log(`Processed page ${page} for ${description}: ${issues.length} issues`);
            page++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error fetching ${description}:`, error);
        }
      };

      // Fetch bounties from all sources
      await fetchBountiesForQuery(bountyQuery, "bounty labels");
      await fetchBountiesForQuery(dollarQuery, "dollar labels");
      await fetchBountiesForQuery(antiworkQuery, "antiwork dollar labels");

      // Sort bounties by updated_at (most recent first)
      allBounties.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      // Cache the results with 1 hour expiration
      await redisCache.setex("snapshots:latest", 3600, JSON.stringify(allBounties));
      await redisCache.setex("snapshots:top100", 3600, JSON.stringify(allBounties.slice(0, 100)));

      // Cache the total amount
      const formattedTotal = formatBountyAmount(totalAmount);
      await redisCache.setex("bounty:total", 3600, JSON.stringify({
        amount: totalAmount,
        formatted: formattedTotal,
        lastUpdated: new Date().toISOString(),
        count: processed
      }));

      console.log(`✅ Bounty initialization complete: ${processed} bounties, total: ${formattedTotal}`);

      return {
        success: true,
        message: "Bounty data initialized successfully",
        bountyCount: processed,
        totalAmount,
        formattedTotal,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("❌ Error during bounty initialization:", error);
      
      // Set empty cache to prevent repeated initialization attempts
      await redisCache.setex("snapshots:latest", 1800, JSON.stringify([])); // 30 minutes
      await redisCache.setex("bounty:total", 1800, JSON.stringify({
        amount: 0,
        formatted: "$0",
        lastUpdated: new Date().toISOString(),
        count: 0
      }));

      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error during initialization",
        bountyCount: 0,
        totalAmount: 0,
        formattedTotal: "$0",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check and initialize bounty data if needed
   */
  async ensureBountyData(): Promise<BountyInitializationResult | null> {
    const hasData = await this.hasBountyData();
    
    if (!hasData) {
      console.log("No bounty data found, initializing...");
      return await this.initializeBountyData();
    }
    
    console.log("Bounty data already exists in cache");
    return null;
  }
}

// Export singleton instance
export const bountyInitializationService = new BountyInitializationService();

/**
 * Utility function to ensure bounty data exists
 * Can be called from API routes or server components
 */
export async function ensureBountyDataExists(): Promise<BountyInitializationResult | null> {
  return await bountyInitializationService.ensureBountyData();
}