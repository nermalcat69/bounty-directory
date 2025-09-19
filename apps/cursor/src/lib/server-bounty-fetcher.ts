/**
 * Server-side bounty data fetcher for ISR
 * This allows us to fetch bounty data on the server during build/revalidation
 */

import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import type { BountyWithAmount } from "@/app/api/bounties/route";

interface BountyItem {
  id: string;
  repo: string;
  title: string;
  raw?: string;
  html_url: string;
  user_login: string;
  user_avatar_url?: string;
  created_at: string;
  updated_at: string;
  labels: string;
  comments: number;
  language: string | null;
  amount: string | null;
}

interface ServerBountyData {
  bounties: BountyWithAmount[];
  total: {
    count: number;
    amount: number;
    formatted: string;
  };
  cached: boolean;
  timestamp: string;
}

/**
 * Fetch bounty data on the server for ISR
 */
export async function fetchBountiesForISR(options: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  language?: string;
} = {}): Promise<ServerBountyData> {
  const {
    page = 1,
    limit = 20,
    sort = 'amount',
    order = 'desc',
    language
  } = options;

  try {
    // Generate cache keys
    const generateCacheKey = (type: string, filters?: Record<string, any>) => {
      if (!filters || Object.keys(filters).length === 0) {
        return `bounty:${type}`;
      }
      const filterString = Object.entries(filters)
        .filter(([_, value]) => value !== null && value !== undefined && value !== 'all')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      return filterString ? `bounty:${type}:${filterString}` : `bounty:${type}`;
    };

    // Check for cached totals
    const totalCacheKey = generateCacheKey('total', language ? { language } : {});
    const cachedTotalData = await redis.get(totalCacheKey);
    let totalData = null;
    let isCachedTotal = false;

    if (cachedTotalData) {
      try {
        const rawTotalData = JSON.parse(cachedTotalData);
        const cacheAge = Date.now() - new Date(rawTotalData.lastUpdated).getTime();
        const isValid = cacheAge < 12 * 60 * 60 * 1000; // 12 hours

        if (isValid) {
          totalData = {
            count: rawTotalData.count || 0,
            amount: rawTotalData.amount || 0,
            formatted: rawTotalData.formatted || "$0"
          };
          isCachedTotal = true;
        }
      } catch (e) {
        console.error("Error parsing cached total data:", e);
      }
    }

    // Get bounties from cache
    const cachedBounties = await redis.get("snapshots:latest");
    let allBounties: BountyItem[] = [];
    let isCachedBounties = false;

    if (cachedBounties) {
      try {
        allBounties = JSON.parse(cachedBounties);
        isCachedBounties = true;
      } catch (e) {
        console.error("Error parsing cached bounties:", e);
        allBounties = [];
      }
    }

    // Process bounties with amounts
    const bountiesWithAmounts: BountyWithAmount[] = allBounties.map(bounty => {
      const bountyAmount = bounty.amount;
      const parsedAmount = bountyAmount ? parseBountyAmount(bountyAmount) : 0;

      return {
        ...bounty,
        amount: bountyAmount,
        parsedAmount,
        createdTimestamp: new Date(bounty.created_at).getTime(),
        updatedTimestamp: new Date(bounty.updated_at).getTime()
      };
    });

    // Calculate totals if not cached
    if (!totalData && allBounties.length > 0) {
      let bountiesForTotal = bountiesWithAmounts;
      if (language && language !== 'all') {
        bountiesForTotal = bountiesWithAmounts.filter(bounty => 
          bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
        );
      }

      const totalAmount = bountiesForTotal.reduce((sum, bounty) => sum + bounty.parsedAmount, 0);
      const totalCount = bountiesForTotal.length;

      totalData = {
        count: totalCount,
        amount: totalAmount,
        formatted: formatBountyAmount(totalAmount),
        lastUpdated: new Date().toISOString()
      };

      // Cache the calculated totals
      const cacheTTL = language ? 43200 : 86400; // 12 hours for filtered, 24 hours for unfiltered
      await redis.setex(totalCacheKey, cacheTTL, JSON.stringify(totalData));
    }

    // Filter and sort bounties
    let filteredBounties = bountiesWithAmounts;
    if (language && language !== 'all') {
      filteredBounties = bountiesWithAmounts.filter(bounty => 
        bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
      );
    }

    // Sort bounties
    filteredBounties.sort((a, b) => {
      let comparison = 0;
      
      switch (sort) {
        case 'amount':
          comparison = b.parsedAmount - a.parsedAmount;
          break;
        case 'created':
          comparison = b.createdTimestamp - a.createdTimestamp;
          break;
        case 'updated':
          comparison = b.updatedTimestamp - a.updatedTimestamp;
          break;
        case 'comments':
          comparison = b.comments - a.comments;
          break;
        default:
          comparison = b.updatedTimestamp - a.updatedTimestamp;
      }
      
      return order === 'asc' ? -comparison : comparison;
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBounties = filteredBounties.slice(startIndex, endIndex);

    return {
      bounties: paginatedBounties,
      total: totalData || {
        count: 0,
        amount: 0,
        formatted: "$0"
      },
      cached: isCachedTotal && isCachedBounties,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("Error fetching bounties for ISR:", error);
    return {
      bounties: [],
      total: {
        count: 0,
        amount: 0,
        formatted: "$0"
      },
      cached: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get total bounty amount for ISR (used in homepage)
 */
export async function getTotalBountyAmountForISR(): Promise<string> {
  try {
    const cachedTotalData = await redis.get('bounty:total');
    
    if (cachedTotalData) {
      try {
        const rawTotalData = JSON.parse(cachedTotalData);
        const cacheAge = Date.now() - new Date(rawTotalData.lastUpdated).getTime();
        const isValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours
        
        if (isValid) {
          return rawTotalData.formatted || "$0";
        }
      } catch (e) {
        console.error("Error parsing cached total data:", e);
      }
    }

    // Fallback to calculating from raw data
    const cachedBounties = await redis.get("snapshots:latest");
    if (cachedBounties) {
      try {
        const allBounties = JSON.parse(cachedBounties);
        const totalAmount = allBounties.reduce((sum: number, bounty: BountyItem) => {
          const parsedAmount = bounty.amount ? parseBountyAmount(bounty.amount) : 0;
          return sum + parsedAmount;
        }, 0);
        
        return formatBountyAmount(totalAmount);
      } catch (e) {
        console.error("Error calculating total from raw bounties:", e);
      }
    }

    return "$0";
  } catch (error) {
    console.error("Error getting total bounty amount for ISR:", error);
    return "$0";
  }
}