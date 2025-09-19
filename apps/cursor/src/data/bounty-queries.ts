import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";

export interface BountyAmount {
  amount: number;
  formatted: string;
}

export interface SnapshotBounty {
  id: string;
  repo: string;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  user_login: string;
  created_at: Date;
  updated_at: Date;
  labels: string;
  comments: number;
  state: string;
  assignee: string | null;
  language: string | null;
}

interface CachedBountyTotal {
  amount: number;
  formatted: string;
  lastUpdated: string;
  count: number;
}

/**
 * Server-side function to calculate total bounty amount from cached Redis data
 */
export async function getTotalBountyAmount(): Promise<string> {
  try {
    // Directly get from Redis cache (no HTTP requests during SSR)
    const cachedTotal = await redis.get("bounty:total");
    if (cachedTotal) {
      const parsed: CachedBountyTotal = JSON.parse(cachedTotal);
      console.log(`Retrieved cached total bounty amount: ${parsed.formatted}`);
      return parsed.formatted;
    }

    console.log("No cached total bounty amount found, returning $0");
    return "$0";
  } catch (error) {
    console.error("Error fetching total bounty amount from cache:", error);
    return "$0";
  }
}