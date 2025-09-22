import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";

export interface CacheUpdateResult {
  success: boolean;
  updated: string[];
  errors: string[];
}

/**
 * Update Redis cache when a bounty issue is modified
 */
export async function updateBountyCacheForIssue(
  issue: any,
  action: string
): Promise<CacheUpdateResult> {
  const result: CacheUpdateResult = {
    success: true,
    updated: [],
    errors: []
  };

  try {
    // Check if this is a bounty issue
    const isBountyIssue = issue.labels?.some((label: any) => 
      label.name.includes('💎 Bounty') || 
      label.name.includes('$') ||
      /bounty|reward|prize/i.test(label.name)
    );

    if (!isBountyIssue) {
      return result;
    }

    // Update bounties:latest cache
    await updateLatestBountiesCache(issue, action, result);
    
    // Update total bounty amount cache
    await updateTotalBountyCache(result);
    
    // Update snapshots cache if needed
    if (action === "opened" || action === "reopened") {
      await updateSnapshotsCache(issue, result);
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Cache update failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

async function updateLatestBountiesCache(
  issue: any,
  action: string,
  result: CacheUpdateResult
) {
  try {
    const cacheKey = 'bounties:latest';
    const cachedData = await redisCache.get(cacheKey);
    
    if (cachedData) {
      let bounties = JSON.parse(cachedData);
      
      if (action === "closed") {
        // Remove the issue from cache
        bounties = bounties.filter((b: any) => b.id !== issue.id.toString());
        result.updated.push(`Removed issue ${issue.id} from latest bounties cache`);
      } else {
        // Update or add the issue
        const existingIndex = bounties.findIndex((b: any) => b.id === issue.id.toString());
        
        const updatedBounty = {
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
          language: null // Will be set by the main system
        };

        if (existingIndex >= 0) {
          bounties[existingIndex] = updatedBounty;
          result.updated.push(`Updated issue ${issue.id} in latest bounties cache`);
        } else {
          bounties.unshift(updatedBounty);
          result.updated.push(`Added issue ${issue.id} to latest bounties cache`);
        }
      }
      
      // Keep only the latest 5000 bounties to accommodate all active bounties
      bounties = bounties.slice(0, 5000);
      
      // Update cache with 1 hour expiration
      await redisCache.setex(cacheKey, 3600, JSON.stringify(bounties));
    }
  } catch (error) {
    result.errors.push(`Failed to update latest bounties cache: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function updateTotalBountyCache(result: CacheUpdateResult) {
  try {
    // For total cache, we'll just invalidate it and let the next request recalculate
    // This is more reliable than trying to incrementally update the total
    await Promise.all([
      redisCache.del('bounty:total'),
    redisCache.del('bounty:languages') // Also invalidate language statistics
    ]);
    result.updated.push('Invalidated total bounty and language caches for recalculation');
  } catch (error) {
    result.errors.push(`Failed to update total bounty cache: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function updateSnapshotsCache(
  issue: any,
  result: CacheUpdateResult
) {
  try {
    // For snapshots, we'll also invalidate and let the daily cron job handle full updates
    // This ensures data consistency
    await Promise.all([
      redisCache.del('snapshots:latest'),
    redisCache.del('snapshots:top100')
    ]);
    result.updated.push('Invalidated snapshots cache for fresh data');
  } catch (error) {
    result.errors.push(`Failed to update snapshots cache: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract bounty amount from an issue
 */
export function extractBountyAmount(issue: any): number {
  let bountyAmount = null;
  
  for (const label of issue.labels || []) {
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
  
  return bountyAmount ? parseBountyAmount(bountyAmount) : 0;
}