import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/kv";
import { parseBountyAmount, formatBountyAmount } from "@/utils/bounty-calculator";

interface BountyItem {
  id: string;
  repo: string;
  title: string;
  raw?: string; // Redis uses 'raw' instead of 'body'
  html_url: string;
  user_login: string;
  user_avatar_url?: string;
  created_at: string; // Redis stores as string, not Date
  updated_at: string; // Redis stores as string, not Date
  labels: string;
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
    const mode = searchParams.get('mode') || 'total'; // 'total', 'list', or 'both'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort') || 'amount'; // 'amount', 'created', 'updated'
    const order = searchParams.get('order') || 'desc'; // 'asc' or 'desc'
    const language = searchParams.get('language'); // language filter
    const force = searchParams.get('force') === 'true'; // force refresh cache

    // Generate cache keys based on filters
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

    // Check if we have cached totals (only skip if force refresh AND requesting total mode)
    const skipTotalCache = force && mode === 'total';
    const totalCacheKey = generateCacheKey('total', language ? { language } : {});
    const cachedTotalData = skipTotalCache ? null : await redis.get(totalCacheKey);
    let totalData = null;
    let isCachedTotal = false;

    if (cachedTotalData && !skipTotalCache) {
      try {
        const rawTotalData = JSON.parse(cachedTotalData);
        const cacheAge = Date.now() - new Date(rawTotalData.lastUpdated).getTime();
        const isValid = cacheAge < 12 * 60 * 60 * 1000; // 12 hours for filtered results
        
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

    // Only process bounties if we need to calculate totals or sort (not cached)
    let bountiesWithAmounts: BountyWithAmount[] = [];
    let shouldProcessBounties = false;
    
    // Check if we need to process bounties for totals
    if (!totalData) {
      shouldProcessBounties = true;
    }
    
    // Check if we need to process bounties for list mode (only check cache key existence, not content)
    if ((mode === 'list' || mode === 'both') && !force) {
      const listCacheKey = generateCacheKey('sorted', { 
        language: language || 'all', 
        sort: sortBy, 
        order 
      });
      const cacheExists = await redis.exists(listCacheKey);
      if (!cacheExists) {
        shouldProcessBounties = true;
      }
    }
    
    // Only process if needed
    if (shouldProcessBounties || force) {
      console.log(`Processing ${allBounties.length} bounties for computation...`);
      bountiesWithAmounts = allBounties.map(bounty => {
        const bountyAmount = bounty.amount; // Use the stored amount field
        const parsedAmount = bountyAmount ? parseBountyAmount(bountyAmount) : 0;

        return {
          ...bounty,
          amount: bountyAmount,
          parsedAmount,
          // Pre-compute timestamps for faster sorting (handle string dates from Redis)
          createdTimestamp: new Date(bounty.created_at).getTime(),
          updatedTimestamp: new Date(bounty.updated_at).getTime()
        };
      });
    } else {
      console.log("Using cached data, skipping bounty processing");
    }

    // Calculate totals if not cached
    if (!totalData) {
      if (allBounties.length > 0) {
        // Filter bounties for total calculation if language filter is applied
        let bountiesForTotal = bountiesWithAmounts;
        if (language && language !== 'all') {
          bountiesForTotal = bountiesWithAmounts.filter(bounty => 
            bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
          );
        }
        
        // Calculate totals based on filtered bounties
        const totalAmount = bountiesForTotal.reduce((sum, bounty) => sum + bounty.parsedAmount, 0);
        const totalCount = bountiesForTotal.length;
        
        totalData = {
          count: totalCount,
          amount: totalAmount,
          formatted: formatBountyAmount(totalAmount),
          lastUpdated: new Date().toISOString()
        };

        // Cache the calculated totals with appropriate TTL
        const cacheTTL = language ? 43200 : 86400; // 12 hours for filtered, 24 hours for unfiltered
        await redis.setex(totalCacheKey, cacheTTL, JSON.stringify(totalData));
        console.log(`Calculated and cached totals for ${language || 'all languages'}: ${totalCount} bounties, ${formatBountyAmount(totalAmount)}`);
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
      // Generate cache key for sorted list
      const listCacheKey = generateCacheKey('sorted', { 
        language: language || 'all', 
        sort: sortBy, 
        order 
      });
      
      let validBounties: BountyWithAmount[] = [];
      let isListCached = false;
      
      // Check for cached sorted list (skip if force refresh)
      if (!force) {
        const cachedList = await redis.get(listCacheKey);
        if (cachedList) {
          try {
            const cachedData = JSON.parse(cachedList);
            const cacheAge = Date.now() - new Date(cachedData.timestamp).getTime();
            if (cacheAge < 30 * 60 * 1000) { // 30 minutes cache for sorted lists
              validBounties = cachedData.bounties;
              isListCached = true;
              console.log(`Cache HIT: Using cached sorted list for ${language || 'all'} (${sortBy} ${order}) - ${validBounties.length} bounties`);
            } else {
              console.log(`Cache EXPIRED: Cached list for ${language || 'all'} (${sortBy} ${order}) is ${Math.round(cacheAge / 60000)} minutes old`);
            }
          } catch (e) {
            console.error("Error parsing cached list:", e);
          }
        } else {
          console.log(`Cache MISS: No cached list found for ${language || 'all'} (${sortBy} ${order})`);
        }
      }
      
      // If not cached, process and sort bounties
      if (!isListCached) {
        // Start with all bounties (don't filter by amount)
        validBounties = bountiesWithAmounts;
        
        // Apply language filter if specified
        if (language && language !== 'all') {
          validBounties = validBounties.filter(bounty => 
            bounty.language && bounty.language.toLowerCase() === language.toLowerCase()
          );
        }

        // Sort bounties using pre-computed timestamps for better performance
        validBounties.sort((a, b) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'amount':
              comparison = b.parsedAmount - a.parsedAmount;
              break;
            case 'created':
              comparison = b.createdTimestamp - a.createdTimestamp;
              break;
            case 'updated':
              comparison = b.updatedTimestamp - a.updatedTimestamp;
              break;
            default:
              comparison = b.parsedAmount - a.parsedAmount;
          }

          return order === 'asc' ? -comparison : comparison;
        });
        
        // Cache the sorted list for 30 minutes
        const listCacheData = {
          bounties: validBounties,
          timestamp: new Date().toISOString()
        };
        await redis.setex(listCacheKey, 1800, JSON.stringify(listCacheData)); // 30 minutes
        console.log(`Cached sorted list for ${language || 'all'} (${sortBy} ${order}): ${validBounties.length} bounties`);
      }

      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBounties = validBounties.slice(startIndex, endIndex);
      const totalPages = Math.ceil(validBounties.length / limit);
      
      // Update response cached status
      response.cached = response.cached && isListCached;

      response.data.bounties = paginatedBounties;
      response.data.pagination = {
        page,
        limit,
        hasMore: endIndex < validBounties.length,
        totalPages
      };
    }

    // Add optimized cache headers for ISR
    const jsonResponse = NextResponse.json(response);
    
    // Use different cache strategies based on data freshness
    if (response.cached) {
      // Data is from cache, allow longer browser cache with stale-while-revalidate
      jsonResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800');
    } else {
      // Fresh data, shorter cache but still allow stale-while-revalidate
      jsonResponse.headers.set('Cache-Control', 'public, max-age=180, s-maxage=300, stale-while-revalidate=900');
    }
    
    jsonResponse.headers.set('Vary', 'Accept-Encoding');
    jsonResponse.headers.set('X-Cache-Status', response.cached ? 'HIT' : 'MISS');
    
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
    
    await redis.setex("bounty:languages", 28800, JSON.stringify(languageData));
    console.log(`Calculated and cached ${languages.length} languages`);

    // Warm cache for popular language filters (async, don't wait)
    const popularLanguages = ['typescript', 'javascript', 'python', 'rust', 'go'];
    popularLanguages.forEach(async (lang) => {
       if (languages.some(l => l && l.toLowerCase() === lang)) {
        const warmCacheKey = `bounty:total:language:${lang}`;
        const existingCache = await redis.get(warmCacheKey);
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
          await redis.setex(warmCacheKey, 43200, JSON.stringify(langData)); // 12 hours
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