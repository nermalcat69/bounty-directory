import { unstable_cache } from "next/cache";
import {
  getFeaturedJobs,
  getPopularPosts,
  getTotalUsers,
} from "@/data/queries";
import { getCachedTotalBountyAmountString } from "@/lib/cached-bounty-fetcher";
import { getPopularRules } from "@directories/data/popular";

// Cache configuration
const CACHE_TTL = {
  POPULAR_RULES: 60 * 60, // 1 hour
  FEATURED_JOBS: 60 * 30, // 30 minutes
  TOTAL_USERS: 60 * 15, // 15 minutes
  BOUNTY_AMOUNT: 60 * 10, // 10 minutes
  POPULAR_POSTS: 60 * 20, // 20 minutes
};

// Cached version of getPopularRules
export const getCachedPopularRules = unstable_cache(
  async () => {
    return await getPopularRules();
  },
  ["popular-rules"],
  {
    revalidate: CACHE_TTL.POPULAR_RULES,
    tags: ["popular-rules", "homepage"],
  }
);

// Cached version of getFeaturedJobs
export const getCachedFeaturedJobs = unstable_cache(
  async (options: { onlyPremium?: boolean } = {}) => {
    return await getFeaturedJobs(options);
  },
  ["featured-jobs"],
  {
    revalidate: CACHE_TTL.FEATURED_JOBS,
    tags: ["featured-jobs", "homepage"],
  }
);

// Cached version of getTotalUsers
export const getCachedTotalUsers = unstable_cache(
  async () => {
    return await getTotalUsers();
  },
  ["total-users"],
  {
    revalidate: CACHE_TTL.TOTAL_USERS,
    tags: ["total-users", "homepage"],
  }
);

// Cached version of getTotalBountyAmountForISR
export const getCachedTotalBountyAmount = unstable_cache(
  async (): Promise<string> => {
    return await getCachedTotalBountyAmountString();
  },
  ["total-bounty-amount"],
  {
    revalidate: CACHE_TTL.BOUNTY_AMOUNT,
    tags: ["total-bounty-amount", "homepage", "bounties"],
  }
);

// Cached version of getPopularPosts
export const getCachedPopularPosts = unstable_cache(
  async () => {
    return await getPopularPosts();
  },
  ["popular-posts"],
  {
    revalidate: CACHE_TTL.POPULAR_POSTS,
    tags: ["popular-posts", "homepage"],
  }
);

// Helper function to revalidate all homepage caches
export async function revalidateHomepageCache() {
  const { revalidateTag } = await import("next/cache");
  revalidateTag("homepage");
}

// Helper function to revalidate specific cache sections
export async function revalidateSpecificCache(section: keyof typeof CACHE_TTL) {
  const { revalidateTag } = await import("next/cache");
  
  const tagMap = {
    POPULAR_RULES: "popular-rules",
    FEATURED_JOBS: "featured-jobs", 
    TOTAL_USERS: "total-users",
    BOUNTY_AMOUNT: "total-bounty-amount",
    POPULAR_POSTS: "popular-posts",
  };
  
  revalidateTag(tagMap[section]);
}