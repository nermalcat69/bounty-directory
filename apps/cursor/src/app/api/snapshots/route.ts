import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/kv";

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

export interface SnapshotResponse {
  bounties: SnapshotBounty[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
  cached: boolean;
  cache_timestamp?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const per_page = Math.min(parseInt(searchParams.get("per_page") || "30"), 100);
    const language = searchParams.get("language");
    const repo = searchParams.get("repo");
    const sort = searchParams.get("sort") || "recent"; // recent, oldest, comments
    const search = searchParams.get("search");

    // Try to get from Redis cache first
    const cacheKey = `snapshots:${JSON.stringify({ page, per_page, language, repo, sort, search })}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const cachedData = JSON.parse(cached);
      return NextResponse.json({
        ...cachedData,
        cached: true,
      });
    }

    // For now, get from the pre-cached snapshot in Redis
    // This will be populated by the bounty worker
    let snapshotKey = "snapshots:latest";
    
    // Try to get specific cached snapshots
    if (!language && !repo && !search && sort === "recent") {
      if (page === 1 && per_page <= 100) {
        snapshotKey = "snapshots:top100";
      }
    }

    const snapshot = await redis.get(snapshotKey);
    
    if (!snapshot) {
      return NextResponse.json(
        { error: "No bounty data available. Worker may not have run yet." },
        { status: 503 }
      );
    }

    let allBounties: SnapshotBounty[] = JSON.parse(snapshot);

    // Apply filters
    if (language && language !== "all") {
      allBounties = allBounties.filter(b => b.language === language);
    }

    if (repo) {
      allBounties = allBounties.filter(b => b.repo === repo);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allBounties = allBounties.filter(b => 
        b.title.toLowerCase().includes(searchLower) ||
        (b.body && b.body.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        allBounties.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "comments":
        allBounties.sort((a, b) => b.comments - a.comments);
        break;
      case "recent":
      default:
        allBounties.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    // Apply pagination
    const total_count = allBounties.length;
    const start = (page - 1) * per_page;
    const end = start + per_page;
    const bounties = allBounties.slice(start, end);
    const has_more = end < total_count;

    const response: SnapshotResponse = {
      bounties,
      total_count,
      page,
      per_page,
      has_more,
      cached: false,
      cache_timestamp: new Date().toISOString(),
    };

    // Cache the response for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response));

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching snapshot:", error);
    return NextResponse.json(
      { error: "Failed to fetch bounty snapshot" },
      { status: 500 }
    );
  }
}

// Get snapshot statistics
export async function POST() {
  try {
    // Try cache first
    const cached = await redis.get("snapshots:stats");
    if (cached) {
      return NextResponse.json({
        ...JSON.parse(cached),
        cached: true,
      });
    }

    // Get from latest snapshot
    const snapshot = await redis.get("snapshots:latest");
    
    if (!snapshot) {
      return NextResponse.json(
        { error: "No bounty data available. Worker may not have run yet." },
        { status: 503 }
      );
    }

    const bounties: SnapshotBounty[] = JSON.parse(snapshot);

    // Calculate stats
    const total_bounties = bounties.length;
    const unique_repos = new Set(bounties.map(b => b.repo)).size;
    
    // Recent bounties (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent_bounties_24h = bounties.filter(b => 
      new Date(b.created_at) > oneDayAgo
    ).length;

    // Language distribution
    const languageCounts: Record<string, number> = {};
    bounties.forEach(b => {
      if (b.language) {
        languageCounts[b.language] = (languageCounts[b.language] || 0) + 1;
      }
    });

    const languages = Object.entries(languageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stats = {
      total_bounties,
      total_repositories: unique_repos,
      recent_bounties_24h,
      languages,
      last_updated: new Date().toISOString(),
    };

    // Cache for 10 minutes
    await redis.setex("snapshots:stats", 600, JSON.stringify(stats));

    return NextResponse.json({
      ...stats,
      cached: false,
    });

  } catch (error) {
    console.error("Error fetching snapshot stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshot statistics" },
      { status: 500 }
    );
  }
}