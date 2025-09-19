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

    // Process bounties with amounts
    const bountiesWithAmounts: BountyWithAmount[] = allBounties.map(bounty => {
      let bountyAmount: string | null = null;
      let parsedAmount = 0;

      try {
        const labels = JSON.parse(bounty.labels || '[]');
        
        for (const labelName of labels) {
          // Enhanced pattern matching for various bounty formats
          const priorityPatterns = [
            /\$(\d+(?:\.\d+)?[km]?)/i,    // $100, $2k, $1.5m
            /(\d+(?:\.\d+)?[km]?)\s*usd/i, // 100 USD, 2k USD
            /(\d+(?:\.\d+)?[km]?)\s*dollars?/i, // 100 dollar(s)
            /bounty[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i, // bounty: $100
            /reward[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i, // reward: $100
            /prize[:\s]*\$?(\d+(?:\.\d+)?[km]?)/i   // prize: $100
          ];

          for (const pattern of priorityPatterns) {
            const match = labelName.match(pattern);
            if (match) {
              bountyAmount = `$${match[1]}`;
              break;
            }
          }

          if (!bountyAmount) {
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
                bountyAmount = `$${value}`;
              }
            }
          }

          if (bountyAmount) break;
        }

        if (bountyAmount) {
          parsedAmount = parseBountyAmount(bountyAmount);
        }
      } catch (e) {
        // Skip bounty amount parsing if labels are malformed
      }

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
        const totalCount = bountiesWithAmounts.filter(bounty => bounty.amount).length;
        
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
      // Filter bounties with amounts
      let validBounties = bountiesWithAmounts.filter(bounty => bounty.amount);
      
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

    // Extract unique languages from bounties with amounts
    const bountiesWithAmounts: BountyWithAmount[] = allBounties.map(bounty => {
      let bountyAmount: string | null = null;
      let parsedAmount = 0;

      try {
        const labels = JSON.parse(bounty.labels || '[]');
        
        for (const labelName of labels) {
          // Enhanced pattern matching for various bounty formats
          const patterns = [
            /\$(\d+(?:\.\d{2})?)/,
            /(\d+(?:\.\d{2})?)\s*USD/i,
            /(\d+(?:\.\d{2})?)\s*dollars?/i,
            /(\d+(?:k|K))/,
            /(\d+(?:m|M))/
          ];

          for (const pattern of patterns) {
            const match = labelName.match(pattern);
            if (match) {
              const value = match[1].toLowerCase();
              const numericPart = parseFloat(value.replace(/[km]/i, ''));
              const hasK = value.includes('k');
              const hasM = value.includes('m');
              
              let baseNumber = numericPart;
              if (hasK) baseNumber *= 1000;
              if (hasM) baseNumber *= 1000000;
              
              if (baseNumber >= 1 && baseNumber <= 100000000) {
                bountyAmount = `$${value}`;
              }
            }
          }

          if (bountyAmount) break;
        }

        if (bountyAmount) {
          parsedAmount = parseBountyAmount(bountyAmount);
        }
      } catch (e) {
        // Skip bounty amount parsing if labels are malformed
      }

      return {
        ...bounty,
        amount: bountyAmount,
        parsedAmount
      };
    });

    // Get unique languages from bounties with amounts
    const validBounties = bountiesWithAmounts.filter(bounty => bounty.amount);
    const languages = [...new Set(validBounties
      .map(bounty => bounty.language)
      .filter(lang => lang && lang.trim() !== '')
    )].sort();

    return NextResponse.json({
      success: true,
      languages
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