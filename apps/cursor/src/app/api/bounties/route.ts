import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";

interface BountyItem {
  id: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  html_url: string;
  user_login: string;
  created_at: Date;
  updated_at: Date;
  labels: string;
  comments: number;
  state: string;
  assignee: string | null;
  language: string | null;
  amount: string | null; // Add amount field to match stored data
}

export interface BountyWithAmount extends BountyItem {
  amount: string | null;
  parsedAmount: number;
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
    const mode = searchParams.get('mode') || 'total'; // 'total', 'list', or 'both'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort') || 'amount'; // 'amount', 'created', 'updated'
    const order = searchParams.get('order') || 'desc'; // 'asc' or 'desc'
    const language = searchParams.get('language'); // language filter
    const force = searchParams.get('force') === 'true'; // force refresh cache

    // Check if we have cached totals (only skip if force refresh AND requesting total mode)
    const skipTotalCache = force && mode === 'total';
    const cachedTotalData = skipTotalCache ? null : await redis.get("bounty:total");
    let totalData = null;
    let isCachedTotal = false;

    if (cachedTotalData && !skipTotalCache) {
      try {
        const rawTotalData = JSON.parse(cachedTotalData);
        const cacheAge = Date.now() - new Date(rawTotalData.lastUpdated).getTime();
        const isValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours
        
        if (isValid) {
          // Normalize the data format (handle both old and new formats)
          totalData = {
            count: rawTotalData.count || 0,
            amount: rawTotalData.amount || 0,
            formatted: rawTotalData.formatted || "$0",
            lastUpdated: rawTotalData.lastUpdated
          };
          isCachedTotal = true;
        } else {
          totalData = null;
        }
      } catch (e) {
        console.error("Error parsing cached total data:", e);
        totalData = null;
      }
    }

    // Get bounties from cache (skip if force refresh)
    const cachedBounties = force ? null : await redis.get("snapshots:latest");
    let allBounties: BountyItem[] = [];
    let isCachedBounties = false;

    if (cachedBounties && !force) {
      try {
        allBounties = JSON.parse(cachedBounties);
        isCachedBounties = true;
      } catch (e) {
        allBounties = [];
      }
    }

    // Process bounties with amounts - use stored amount field instead of re-parsing labels
    const bountiesWithAmounts: BountyWithAmount[] = allBounties.map(bounty => {
      const bountyAmount = bounty.amount; // Use the stored amount field
      const parsedAmount = bountyAmount ? parseBountyAmount(bountyAmount) : 0;

      return {
        ...bounty,
        amount: bountyAmount,
        parsedAmount
      };
    });

    // Calculate totals if not cached
    if (!totalData) {
      if (allBounties.length > 0) {
        // We have bounty data, calculate totals
        const totalAmount = bountiesWithAmounts.reduce((sum, bounty) => sum + bounty.parsedAmount, 0);
        const totalCount = allBounties.length; // Count all bounties, not just those with amounts
        
        totalData = {
          count: totalCount,
          amount: totalAmount,
          formatted: formatBountyAmount(totalAmount),
          lastUpdated: new Date().toISOString()
        };

        // Cache the calculated totals (24 hours)
        await redis.setex("bounty:total", 86400, JSON.stringify(totalData));
        console.log(`Calculated and cached totals: ${totalCount} bounties, ${formatBountyAmount(totalAmount)}`);
      } else {
        // No bounty data available - use fallback totals
        console.log("No bounty data available, using fallback totals");
        totalData = {
          count: 0,
          amount: 0,
          formatted: "$0",
          lastUpdated: new Date().toISOString()
        };
      }
    }

    // Prepare response based on mode
    const response: BountyResponse = {
      success: true,
      data: {
        total: {
          count: totalData.count,
          amount: totalData.amount,
          formatted: totalData.formatted
        }
      },
      cached: isCachedTotal && isCachedBounties,
      timestamp: new Date().toISOString()
    };

    // If requesting bounty list or both
    if (mode === 'list' || mode === 'both') {
      // Start with all bounties (don't filter by amount)
      let validBounties = bountiesWithAmounts;
      
      // Apply language filter if specified
      if (language && language !== 'all') {
        validBounties = validBounties.filter(bounty => 
          bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
        );
      }

      // Sort bounties
      validBounties.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'amount':
            comparison = b.parsedAmount - a.parsedAmount;
            break;
          case 'created':
            comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            break;
          case 'updated':
            comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            break;
          default:
            comparison = b.parsedAmount - a.parsedAmount;
        }

        return order === 'asc' ? -comparison : comparison;
      });

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBounties = validBounties.slice(startIndex, endIndex);
      const totalPages = Math.ceil(validBounties.length / limit);

      response.data.bounties = paginatedBounties;
      response.data.pagination = {
        page,
        limit,
        hasMore: endIndex < validBounties.length,
        totalPages
      };
    }

    return NextResponse.json(response);

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
      const cachedLanguages = await redis.get("bounty:languages");
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
    const cachedBounties = await redis.get("snapshots:latest");
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
      parsedAmount: bounty.amount ? parseBountyAmount(bounty.amount) : 0
    }));

    // Get unique languages from bounties with amounts
    const validBounties = bountiesWithAmounts.filter(bounty => bounty.amount);
    const languages = [...new Set(validBounties
      .map(bounty => bounty.language)
      .filter(lang => lang && lang.trim() !== '')
    )].sort();

    // Cache the language statistics for 6 hours (21600 seconds)
    const languageData = {
      languages,
      timestamp: new Date().toISOString(),
      count: languages.length
    };
    
    await redis.setex("bounty:languages", 21600, JSON.stringify(languageData));
    console.log(`Calculated and cached ${languages.length} languages`);

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