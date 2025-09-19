import { NextRequest, NextResponse } from "next/server";
import { GitHubAPI } from "@/lib/github";

export interface BountyIssue {
  id: number;
  title: string;
  body: string;
  html_url: string;
  repository_url: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  comments: number;
  repository: {
    name: string;
    full_name: string;
    language: string | null;
    stargazers_count: number;
  };
  bounty_amount?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");
    const page = searchParams.get("page") || "1";
    const limit = parseInt(searchParams.get("limit") || "30");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sort") || "recent";
    
    // Build the GitHub search query
    let query = 'label:"💎 Bounty" state:open';
    if (language && language !== "all") {
      query += ` language:${language}`;
    }
    
    // Determine sort parameters based on sortBy value
    let sortParam = "updated";
    let orderParam = "desc";
    
    switch (sortBy) {
      case "recent":
        sortParam = "updated";
        orderParam = "desc";
        break;
      case "least-attempts":
        sortParam = "comments";
        orderParam = "asc";
        break;
      default:
        sortParam = "updated";
        orderParam = "desc";
    }
    
    const github = new GitHubAPI(process.env.GITHUB_TOKEN);
    
    // Calculate page from offset if offset is provided
    const calculatedPage = offset > 0 ? Math.floor(offset / limit) + 1 : parseInt(page);
    
    const result = await github.searchIssues(
      query,
      calculatedPage,
      limit,
      sortParam,
      orderParam as "desc" | "asc"
    );

    const data = result.data;
    
    // Enhance the issues with repository information
    const enhancedIssues = await Promise.all(
      data.items.map(async (issue: any) => {
        try {
          // Extract repository info from repository_url
          const repoResponse = await fetch(issue.repository_url, {
            headers: {
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Cursor-Directory-App",
              ...(process.env.GITHUB_TOKEN && {
                "Authorization": `token ${process.env.GITHUB_TOKEN}`
              })
            },
            next: { revalidate: 3600 } // Cache repo info for 1 hour
          });
          
          const repoData = repoResponse.ok ? await repoResponse.json() : null;
          
          // Extract bounty amount from labels, body, or title
          let bountyAmount = null;
          
          // Try to extract from all labels (not just bounty-specific ones)
          for (const label of issue.labels) {
            const labelName = label.name.toLowerCase();
            
            // Look for various patterns in labels
            const patterns = [
              /\$(\d+)/,                    // $100
              /(\d+)\s*usd/i,              // 100 USD
              /(\d+)\s*dollars?/i,         // 100 dollar(s)
              /bounty[:\s]*(\d+)/i,        // bounty: 100 or bounty 100
              /reward[:\s]*(\d+)/i,        // reward: 100 or reward 100
              /prize[:\s]*(\d+)/i          // prize: 100 or prize 100
            ];
            
            for (const pattern of patterns) {
              const match = label.name.match(pattern);
              if (match) {
                bountyAmount = `$${match[1]}`;
                break;
              }
            }
            
            if (bountyAmount) break;
          }
          
          // Try to extract from issue body if not found in labels
          if (!bountyAmount && issue.body) {
            const bodyPatterns = [
              /bounty[:\s]*\$(\d+)/i,      // bounty: $100
              /reward[:\s]*\$(\d+)/i,      // reward: $100
              /prize[:\s]*\$(\d+)/i,       // prize: $100
              /\$(\d+)\s*bounty/i,         // $100 bounty
              /\$(\d+)\s*reward/i,         // $100 reward
              /\$(\d+)/                    // $100 (standalone)
            ];
            
            for (const pattern of bodyPatterns) {
              const match = issue.body.match(pattern);
              if (match) {
                bountyAmount = `$${match[1]}`;
                break;
              }
            }
          }
          
          // Try to extract from issue title if not found elsewhere
          if (!bountyAmount && issue.title) {
            const titlePatterns = [
              /\$(\d+)/,                   // $100
              /bounty[:\s]*(\d+)/i,        // bounty: 100
              /reward[:\s]*(\d+)/i,        // reward: 100
              /(\d+)\s*usd/i               // 100 USD
            ];
            
            for (const pattern of titlePatterns) {
              const match = issue.title.match(pattern);
              if (match) {
                bountyAmount = `$${match[1]}`;
                break;
              }
            }
          }

          return {
            id: issue.id,
            title: issue.title,
            body: issue.body || "",
            html_url: issue.html_url,
            repository_url: issue.repository_url,
            labels: issue.labels,
            user: issue.user,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            state: issue.state,
            comments: issue.comments || 0,
            repository: {
              name: repoData?.name || issue.repository_url.split("/").pop(),
              full_name: repoData?.full_name || issue.repository_url.split("/").slice(-2).join("/"),
              language: repoData?.language,
              stargazers_count: repoData?.stargazers_count || 0
            },
            bounty_amount: bountyAmount
          };
        } catch (error) {
          console.error("Error enhancing issue:", error);
          return {
            ...issue,
            comments: issue.comments || 0,
            repository: {
              name: issue.repository_url.split("/").pop(),
              full_name: issue.repository_url.split("/").slice(-2).join("/"),
              language: null,
              stargazers_count: 0
            }
          };
        }
      })
    );

    return NextResponse.json({
      items: enhancedIssues,
      total_count: data.total_count,
      page: calculatedPage,
      limit,
      offset,
      has_more: data.total_count > (offset + limit),
      next_offset: offset + limit
    });

  } catch (error) {
    console.error("Error fetching bounty issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch bounty issues" },
      { status: 500 }
    );
  }
}

// Get available languages from bounty issues
export async function POST() {
  try {
    const github = new GitHubAPI(process.env.GITHUB_TOKEN);
    
    const result = await github.searchIssues(
      'label:"💎 Bounty" state:open',
      1,
      100 // per_page
    );

    const data = result.data;
    
    // Extract unique languages from repositories
    const languages = new Set<string>();
    
    await Promise.all(
      data.items.slice(0, 50).map(async (issue: any) => {
        try {
          const repoResponse = await fetch(issue.repository_url, {
            headers: {
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Cursor-Directory-App",
              ...(process.env.GITHUB_TOKEN && {
                "Authorization": `token ${process.env.GITHUB_TOKEN}`
              })
            },
            next: { revalidate: 3600 }
          });
          
          if (repoResponse.ok) {
            const repoData = await repoResponse.json();
            if (repoData.language) {
              languages.add(repoData.language);
            }
          }
        } catch (error) {
          console.error("Error fetching repo language:", error);
        }
      })
    );

    return NextResponse.json({
      languages: Array.from(languages).sort()
    });

  } catch (error) {
    console.error("Error fetching languages:", error);
    return NextResponse.json(
      { error: "Failed to fetch languages" },
      { status: 500 }
    );
  }
}