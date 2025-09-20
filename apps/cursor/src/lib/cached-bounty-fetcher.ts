/**
 * Cached bounty data fetcher using Next.js unstable_cache
 * This reduces Redis calls by caching data at the Next.js level
 */

import { unstable_cache } from "next/cache";
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

/**
 * Cached function to get bounty snapshot from Redis
 */
const getCachedBountySnapshot = unstable_cache(
  async (): Promise<BountyItem[]> => {
    const cachedBounties = await redis.get("snapshots:latest");
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
      const amount = bounty.amount ? parseBountyAmount(bounty.amount) : 0;
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
    tags: ["bounty-totals", "bounties", "total-bounty-amount"],
  }
);

/**
 * Cached function to get paginated bounties
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
      // Note: We need to process all bounties to ensure proper sorting and pagination
       const bountiesWithAmounts: BountyWithAmount[] = filteredBounties.map(bounty => {
          const parsedAmount = bounty.amount ? parseBountyAmount(bounty.amount) : 0;
        return {
          ...bounty,
          amount: bounty.amount,
          parsedAmount,
          createdTimestamp: new Date(bounty.created_at).getTime(),
          updatedTimestamp: new Date(bounty.updated_at).getTime(),
          user_avatar_url: bounty.user_avatar_url || `https://github.com/${bounty.user_login}.png`,
        };
      });

      // Sort bounties
      const sortedBounties = bountiesWithAmounts.sort((a, b) => {
        switch (sort) {
          case 'amount':
            return order === 'desc' ? b.parsedAmount - a.parsedAmount : a.parsedAmount - b.parsedAmount;
          case 'created':
            const aCreatedDate = new Date(a.created_at).getTime();
            const bCreatedDate = new Date(b.created_at).getTime();
            return order === 'desc' ? bCreatedDate - aCreatedDate : aCreatedDate - bCreatedDate;
          case 'updated':
            const aUpdatedDate = new Date(a.updated_at).getTime();
            const bUpdatedDate = new Date(b.updated_at).getTime();
            return order === 'desc' ? bUpdatedDate - aUpdatedDate : aUpdatedDate - bUpdatedDate;
          case 'comments':
            return order === 'desc' ? b.comments - a.comments : a.comments - b.comments;
          default:
            return 0;
        }
      });

      // Paginate
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
    // Get bounties directly from Redis without Next.js caching for ISR
    const cachedBounties = await redis.get("snapshots:latest");
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
      const parsedAmount = bounty.amount ? parseBountyAmount(bounty.amount) : 0;
      return {
        ...bounty,
        amount: bounty.amount,
        parsedAmount,
        createdTimestamp: new Date(bounty.created_at).getTime(),
        updatedTimestamp: new Date(bounty.updated_at).getTime(),
        user_avatar_url: bounty.user_avatar_url || `https://github.com/${bounty.user_login}.png`,
      };
    });

    // Sort bounties
    const sortedBounties = bountiesWithAmounts.sort((a, b) => {
      switch (sort) {
        case 'amount':
          return order === 'desc' ? b.parsedAmount - a.parsedAmount : a.parsedAmount - b.parsedAmount;
        case 'created':
          const aCreatedDate = new Date(a.created_at).getTime();
          const bCreatedDate = new Date(b.created_at).getTime();
          return order === 'desc' ? bCreatedDate - aCreatedDate : aCreatedDate - bCreatedDate;
        case 'updated':
          const aUpdatedDate = new Date(a.updated_at).getTime();
          const bUpdatedDate = new Date(b.updated_at).getTime();
          return order === 'desc' ? bUpdatedDate - aUpdatedDate : aUpdatedDate - bUpdatedDate;
        case 'comments':
          return order === 'desc' ? b.comments - a.comments : a.comments - b.comments;
        default:
          return 0;
      }
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBounties = sortedBounties.slice(startIndex, endIndex);

    // Calculate totals
    let totalAmount = 0;
    let validBounties = 0;

    for (const bounty of filteredBounties) {
      const amount = bounty.amount ? parseBountyAmount(bounty.amount) : 0;
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