import { NextRequest, NextResponse } from "next/server";
import { redisCache } from "@/lib/redis-cache";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";
import { getCachedBounties } from "@/lib/cached-bounty-fetcher";

interface BountyItem {
  id: string;
  repo: string;
  title: string;
  raw?: string; // Redis uses 'raw' instead of 'body'
  html_url: string | undefined;
  url?: string; // Alternative URL field used in some data sources
  user_login: string;
  user_avatar_url?: string;
  created_at: string; // Redis stores as string, not Date
  updated_at: string; // Redis stores as string, not Date
  labels: string | null;
  comments: number;
  language: string | null;
  amount: string | null;
}

export interface BountyWithAmount extends BountyItem {
  amount: string | null;
  parsedAmount: number;
  createdTimestamp: number;
  updatedTimestamp: number;
}

interface BountyResponse {
  success: boolean;
  data: {
    total: {
      count: number;
      amount: number;
      formatted: string;
    };
    bounties?: BountyWithAmount[];
    pagination?: {
      page: number;
      limit: number;
      hasMore: boolean;
      totalPages: number;
    };
  };
  cached: boolean;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50 for performance
    const sort = searchParams.get('sort') || 'amount';
    const order = searchParams.get('order') || 'desc';
    const language = searchParams.get('language');
    
    const cachedData = await getCachedBounties({
      page,
      limit,
      sort,
      order,
      language: language || undefined,
    });
    
    const totalPages = Math.ceil(cachedData.total.count / limit);
    const hasMore = page < totalPages;
    
    const jsonResponse = NextResponse.json({
      success: true,
      data: {
        total: cachedData.total,
        bounties: cachedData.bounties,
        pagination: {
          page,
          limit,
          hasMore,
          totalPages,
        },
      },
      cached: cachedData.cached,
      timestamp: cachedData.timestamp,
    });

    // Add optimized cache headers for ISR
    if (cachedData.cached) {
      // Data is from cache, allow longer browser cache with stale-while-revalidate
      jsonResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800');
    } else {
      // Fresh data, shorter cache but still allow stale-while-revalidate
      jsonResponse.headers.set('Cache-Control', 'public, max-age=180, s-maxage=300, stale-while-revalidate=900');
    }
    
    jsonResponse.headers.set('Vary', 'Accept-Encoding');
    jsonResponse.headers.set('X-Cache-Status', cachedData.cached ? 'HIT' : 'MISS');
    
    return jsonResponse;

  } catch (error) {
    console.error("Error in unified bounty API:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: {
        total: {
          count: 0,
          amount: 0,
          formatted: "$0"
        }
      },
      cached: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    
    // Check cache first for language statistics (unless force is true)
    if (!force) {
      const cachedLanguages = await redisCache.get("bounty:languages");
      if (cachedLanguages) {
        try {
          const parsed = JSON.parse(cachedLanguages);
          console.log("Retrieved cached language statistics");
          return NextResponse.json({
            success: true,
            languages: parsed.languages,
            cached: true,
            timestamp: parsed.timestamp
          });
        } catch (e) {
          console.error("Error parsing cached language data:", e);
        }
      }
    }

    // Get bounties from cache to extract languages
    const cachedBounties = await redisCache.get("snapshots:latest");
    let allBounties: BountyItem[] = [];

    if (cachedBounties) {
      try {
        allBounties = JSON.parse(cachedBounties);
      } catch (e) {
        allBounties = [];
      }
    }

    // The cached bounties already have amount fields populated, so we can use them directly
    const bountiesWithAmounts: BountyWithAmount[] = allBounties.map(bounty => ({
      ...bounty,
      amount: bounty.amount || null,
      parsedAmount: bounty.amount ? parseBountyAmount(bounty.amount) : 0,
      createdTimestamp: new Date(bounty.created_at).getTime(),
      updatedTimestamp: new Date(bounty.updated_at).getTime()
    }));

    // Get unique languages from bounties with amounts
    const validBounties = bountiesWithAmounts.filter(bounty => bounty.amount);
    const languages = [...new Set(validBounties
      .map(bounty => bounty.language)
      .filter(lang => lang && lang.trim() !== '')
    )].sort();

    // Cache the language statistics for 8 hours (28800 seconds) - languages change less frequently
    const languageData = {
      languages,
      timestamp: new Date().toISOString(),
      count: languages.length
    };
    
    await redisCache.setex("bounty:languages", 28800, JSON.stringify(languageData));
    console.log(`Calculated and cached ${languages.length} languages`);

    // Warm cache for popular language filters (async, don't wait)
    const popularLanguages = ['typescript', 'javascript', 'python', 'rust', 'go'];
    popularLanguages.forEach(async (lang) => {
       if (languages.some(l => l && l.toLowerCase() === lang)) {
        const warmCacheKey = `bounty:total:language:${lang}`;
        const existingCache = await redisCache.get(warmCacheKey);
        if (!existingCache) {
          // Calculate totals for this language
          const langBounties = validBounties.filter(bounty => 
            bounty.language && bounty.language.toLowerCase() === lang
          );
          const langTotal = langBounties.reduce((sum, bounty) => sum + bounty.parsedAmount, 0);
          const langData = {
            count: langBounties.length,
            amount: langTotal,
            formatted: formatBountyAmount(langTotal),
            lastUpdated: new Date().toISOString()
          };
          await redisCache.setex(warmCacheKey, 43200, JSON.stringify(langData)); // 12 hours
          console.log(`Warmed cache for ${lang}: ${langBounties.length} bounties`);
        }
      }
    });

    return NextResponse.json({
      success: true,
      languages,
      cached: false,
      timestamp: languageData.timestamp
    });

  } catch (error) {
    console.error("Error fetching languages:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      languages: []
    }, { status: 500 });
  }
}