import { NextRequest, NextResponse } from "next/server";

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
    
    const githubUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=${sortParam}&order=${orderParam}&page=${page}&per_page=30`;
    
    const response = await fetch(githubUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Cursor-Directory-App",
        ...(process.env.GITHUB_TOKEN && {
          "Authorization": `token ${process.env.GITHUB_TOKEN}`
        })
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
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
          
          // Extract bounty amount from labels or body
          const bountyLabel = issue.labels.find((label: any) => 
            label.name.includes("$") || label.name.toLowerCase().includes("bounty")
          );
          
          const bountyAmount = bountyLabel?.name.match(/\$(\d+)/)?.[0] || 
                              issue.body?.match(/bounty[:\s]*\$(\d+)/i)?.[0] ||
                              issue.title?.match(/\$(\d+)/)?.[0];

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
      issues: enhancedIssues,
      total_count: data.total_count,
      page: parseInt(page),
      has_more: data.total_count > parseInt(page) * 30
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
    const githubUrl = `https://api.github.com/search/issues?q=${encodeURIComponent('label:"💎 Bounty" state:open')}&per_page=100`;
    
    const response = await fetch(githubUrl, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Cursor-Directory-App",
        ...(process.env.GITHUB_TOKEN && {
          "Authorization": `token ${process.env.GITHUB_TOKEN}`
        })
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
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