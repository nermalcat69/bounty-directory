import { NextResponse } from "next/server";
import { GitHubAPI, fetchAntiworkBounties } from "@/lib/github";
import { redisCache } from "@/lib/redis-cache";
import { filterIssuesWithDollarLabels } from "@/utils/antiwork-filter";

export const revalidate = 300; // 5 minutes

interface ProcessedIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  comments: number;
  repository: string;
  amount: string | null; // Add amount field to match stored data
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedData: {
  issues: ProcessedIssue[];
  total: number;
  errors?: string[];
} | null = null;
let cacheTimestamp: number = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
      console.log("Serving cached antiwork bounties data");
      return NextResponse.json(cachedData);
    }

    console.log("Fetching antiwork bounties from cached data");
    
    // Get bounties from cache (same data used by main bounties API)
    const cachedBounties = await redisCache.get("snapshots:latest");
    
    if (!cachedBounties) {
      console.log("No cached bounty data found");
      const response = {
        issues: [],
        total: 0,
        errors: ["No cached bounty data available"]
      };
      return NextResponse.json(response);
    }

    try {
      const allBounties = JSON.parse(cachedBounties);
      
      // Filter for antiwork bounties with dollar amounts
      const antiworkBounties = allBounties.filter((bounty: any) => {
        const repo = bounty.repo || '';
        return repo.startsWith('antiwork/') && bounty.amount;
      });
      
      console.log(`Found ${antiworkBounties.length} antiwork bounties with amounts`);
      
      // Process issues to match the expected format
      const processedIssues: ProcessedIssue[] = antiworkBounties.map((bounty: any) => ({
        id: bounty.id,
        number: bounty.number,
        title: bounty.title,
        html_url: bounty.html_url,
        created_at: bounty.created_at,
        updated_at: bounty.updated_at,
        user: {
          login: bounty.user_login,
          avatar_url: `https://github.com/${bounty.user_login}.png`,
        },
        labels: Array.isArray(bounty.labels) 
          ? bounty.labels 
          : JSON.parse(bounty.labels || '[]').map((name: string) => ({
              name,
              color: '000000'
            })),
        comments: bounty.comments,
        repository: bounty.repo,
        amount: bounty.amount
      }));

      const response = {
        issues: processedIssues,
        total: processedIssues.length,
      };

      cachedData = response;
      cacheTimestamp = now;

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error processing cached bounty data:", error);
      
      const response = {
        issues: [],
        total: 0,
        errors: ["Failed to process cached bounty data"]
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error("Error in antiwork bounties endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch antiwork bounties",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}