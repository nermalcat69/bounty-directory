/**
 * Cached bounty data fetcher using Next.js unstable_cache
 * This reduces Redis calls by caching data at the Next.js level
 */

import { unstable_cache } from "next/cache";
import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import type { BountyWithAmount } from "@/app/api/bounties/route";

interface BountyItem {
  id: string;
  repo: string;
  title: string;
  raw?: string;
  html_url: string | undefined;
  url?: string; // Alternative URL field used in some data sources
  user_login: string;
  user_avatar_url?: string;
  created_at: string;
  updated_at: string;
  labels: string | null;
  comments: number;
  language: string | null;
  amount: string | null;
}

interface CachedBountyData {
  bounties: BountyWithAmount[];
  total: {
    count: number;
    amount: number;
    formatted: string;
  };
  cached: boolean;
  timestamp: string;
}

// Cache TTL configurations - optimized for performance
const CACHE_TTL = {
  BOUNTY_LIST: 60 * 3, // 3 minutes for bounty list (faster updates)
  BOUNTY_TOTAL: 60 * 5, // 5 minutes for totals
  BOUNTY_SNAPSHOT: 60 * 10, // 10 minutes for full snapshot (reduced for fresher data)
};

// Helper function to extract amount from labels
function extractAmountFromLabels(labelsData: string | null | undefined | any[]): string | null {
  if (!labelsData) {
    return null;
  }

  try {
    let labels: any[] = [];
    
    // Handle different label formats
    if (typeof labelsData === 'string') {
      labels = JSON.parse(labelsData || '[]');
    } else if (Array.isArray(labelsData)) {
      labels = labelsData;
    } else {
      return null;
    }
    
    // Ensure labels is an array
    if (!Array.isArray(labels)) {
      return null;
    }
    
    for (const label of labels) {
      // Handle both string labels and object labels with name property
      const labelName = typeof label === 'string' ? label : label?.name;
      
      // Ensure labelName is a string
      if (typeof labelName !== 'string') {
        continue;
      }

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
          return `$${match[1]}`;
        }
      }
      
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
          return `$${value}`;
        }
      }
    }
  } catch (error) {
    console.error('Error parsing labels:', error, 'Input:', labelsData);
  }
  
  return null;
}

/**
 * Cached function to get bounty snapshot from PostgreSQL cache
 */
const getCachedBountySnapshot = unstable_cache(
  async (): Promise<BountyItem[]> => {
    const cachedBounties = await redisCache.get("snapshots:latest");
    if (!cachedBounties) {
      return [];
    }
    
    try {
      return JSON.parse(cachedBounties);
    } catch (error) {
      console.error("Error parsing bounty snapshot:", error);
      return [];
    }
  },
  ["bounty-snapshot"],
  {
    revalidate: CACHE_TTL.BOUNTY_SNAPSHOT,
    tags: ["bounty-snapshot", "bounties"],
  }
);

/**
 * Cached function to get bounty totals
 */
const getCachedBountyTotals = unstable_cache(
  async (language?: string): Promise<{ count: number; amount: number; formatted: string }> => {
    const allBounties = await getCachedBountySnapshot();
    
    // Filter by language if specified (case-insensitive)
    const filteredBounties = language && language !== 'all' 
      ? allBounties.filter(bounty => 
          bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
        )
      : allBounties;

    // Calculate totals
    let totalAmount = 0;
    let validBounties = 0;

    for (const bounty of filteredBounties) {
      const extractedAmount = extractAmountFromLabels(bounty.labels);
      const amount = extractedAmount ? parseBountyAmount(extractedAmount) : 0;
      if (amount > 0) {
        totalAmount += amount;
        validBounties++;
      }
    }

    return {
      count: validBounties,
      amount: totalAmount,
      formatted: formatBountyAmount(totalAmount),
    };
  },
  ["bounty-totals"],
  {
    revalidate: CACHE_TTL.BOUNTY_TOTAL,
    tags: ["bounty-totals", "bounties"],
  }
);

/**
 * Cached function to get bounties with pagination and filtering
 */
export const getCachedBounties = unstable_cache(
  async (options: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
    language?: string;
  } = {}): Promise<CachedBountyData> => {
    const {
      page = 1,
      limit = 20,
      sort = 'amount',
      order = 'desc',
      language
    } = options;

    try {
      // Get bounties from cache
      const allBounties = await getCachedBountySnapshot();
      
      if (allBounties.length === 0) {
        return {
          bounties: [],
          total: { count: 0, amount: 0, formatted: "$0" },
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Early filtering by language for performance (case-insensitive)
      const filteredBounties = language && language !== 'all' 
        ? allBounties.filter(bounty => 
            bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
          )
        : allBounties;

      // Transform and calculate amounts for all filtered bounties
      const bountiesWithAmounts: BountyWithAmount[] = filteredBounties.map(bounty => {
        const extractedAmount = extractAmountFromLabels(bounty.labels);
        const parsedAmount = extractedAmount ? parseBountyAmount(extractedAmount) : 0;
        
        return {
          ...bounty,
          amount: extractedAmount,
          parsedAmount,
          createdTimestamp: new Date(bounty.created_at).getTime(),
          updatedTimestamp: new Date(bounty.updated_at).getTime(),
        };
      });

      // Sort bounties
      const sortedBounties = bountiesWithAmounts.sort((a, b) => {
        let comparison = 0;
        
        switch (sort) {
          case 'amount':
            comparison = (a.parsedAmount || 0) - (b.parsedAmount || 0);
            break;
          case 'updated':
            comparison = a.updatedTimestamp - b.updatedTimestamp;
            break;
          case 'created':
            comparison = a.createdTimestamp - b.createdTimestamp;
            break;
          case 'comments':
            comparison = a.comments - b.comments;
            break;
          default:
            comparison = (a.parsedAmount || 0) - (b.parsedAmount || 0);
        }
        
        return order === 'desc' ? -comparison : comparison;
      });

      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBounties = sortedBounties.slice(startIndex, endIndex);

      // Get totals
      const totals = await getCachedBountyTotals(language);

      return {
        bounties: paginatedBounties,
        total: totals,
        cached: true,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error("Error in getCachedBounties:", error);
      return {
        bounties: [],
        total: { count: 0, amount: 0, formatted: "$0" },
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }
  },
  ["bounty-list"],
  {
    revalidate: CACHE_TTL.BOUNTY_LIST,
    tags: ["bounty-list", "bounties"],
  }
);

/**
 * Cached function to get total bounty amount (for homepage)
 */
export const getCachedTotalBountyAmountString = unstable_cache(
  async (): Promise<string> => {
    try {
      const totals = await getCachedBountyTotals();
      return totals.formatted;
    } catch (error) {
      console.error("Error getting cached total bounty amount:", error);
      return "$0";
    }
  },
  ["total-bounty-amount-string"],
  {
    revalidate: CACHE_TTL.BOUNTY_TOTAL,
    tags: ["total-bounty-amount", "bounties", "homepage"],
  }
);

// Helper functions for cache management
export async function revalidateBountyCache() {
  const { revalidateTag } = await import("next/cache");
  revalidateTag("bounties");
}

export async function revalidateBountyTotals() {
  const { revalidateTag } = await import("next/cache");
  revalidateTag("total-bounty-amount");
}

export async function revalidateBountySnapshot() {
  const { revalidateTag } = await import("next/cache");
  revalidateTag("bounty-snapshot");
}

/**
 * Non-cached version for ISR use cases where we need fresh data
 * This is used for server-side rendering and static generation
 */
export async function fetchBountiesForISR(options: {
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  language?: string;
} = {}): Promise<CachedBountyData> {
  const {
    page = 1,
    limit = 20,
    sort = 'amount',
    order = 'desc',
    language
  } = options;

  try {
    // Get bounties directly from PostgreSQL cache without Next.js caching for ISR
    const cachedBounties = await redisCache.get("snapshots:latest");
    if (!cachedBounties) {
      return {
        bounties: [],
        total: { count: 0, amount: 0, formatted: "$0" },
        cached: false,
        timestamp: new Date().toISOString(),
      };
    }

    const allBounties: BountyItem[] = JSON.parse(cachedBounties);
    
    // Filter by language if specified (case-insensitive)
    const filteredBounties = language && language !== 'all' 
      ? allBounties.filter(bounty => 
          bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
        )
      : allBounties;

    // Transform and calculate amounts for all filtered bounties
    const bountiesWithAmounts: BountyWithAmount[] = filteredBounties.map(bounty => {
      // Extract amount from labels using the helper function
      const extractedAmount = extractAmountFromLabels(bounty.labels);
      const parsedAmount = extractedAmount ? parseBountyAmount(extractedAmount) : 0;
      
      return {
        ...bounty,
        amount: extractedAmount,
        parsedAmount,
        createdTimestamp: new Date(bounty.created_at).getTime(),
        updatedTimestamp: new Date(bounty.updated_at).getTime(),
      };
    });

    // Sort bounties
    const sortedBounties = bountiesWithAmounts.sort((a, b) => {
      let comparison = 0;
      
      switch (sort) {
        case 'amount':
          comparison = (a.parsedAmount || 0) - (b.parsedAmount || 0);
          break;
        case 'updated':
          comparison = a.updatedTimestamp - b.updatedTimestamp;
          break;
        case 'created':
          comparison = a.createdTimestamp - b.createdTimestamp;
          break;
        case 'comments':
          comparison = a.comments - b.comments;
          break;
        default:
          comparison = (a.parsedAmount || 0) - (b.parsedAmount || 0);
      }
      
      return order === 'desc' ? -comparison : comparison;
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBounties = sortedBounties.slice(startIndex, endIndex);

    // Calculate totals for filtered bounties
    let totalAmount = 0;
    let validBounties = 0;

    for (const bounty of filteredBounties) {
      const extractedAmount = extractAmountFromLabels(bounty.labels);
      const amount = extractedAmount ? parseBountyAmount(extractedAmount) : 0;
      if (amount > 0) {
        totalAmount += amount;
        validBounties++;
      }
    }

    const totals = {
      count: validBounties,
      amount: totalAmount,
      formatted: formatBountyAmount(totalAmount),
    };

    return {
      bounties: paginatedBounties,
      total: totals,
      cached: false, // ISR doesn't use Next.js cache
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Error in fetchBountiesForISR:", error);
    return {
      bounties: [],
      total: { count: 0, amount: 0, formatted: "$0" },
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get total bounty amount string for ISR
 */
export async function getTotalBountyAmountForISR(): Promise<string> {
  try {
    const data = await fetchBountiesForISR({ limit: 1 }); // We only need totals
    return data.total.formatted;
  } catch (error) {
    console.error("Error getting total bounty amount for ISR:", error);
    return "$0";
  }
}