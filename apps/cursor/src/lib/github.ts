import "server-only";

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  comments: number;
  state: string;
  assignee?: {
    login: string;
  } | null;
  repository_url: string;
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

export class GitHubAPI {
  private baseUrl = "https://api.github.com";
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private normalizeQuery(q: string): string {
    // Ensure it mentions is:issue or is:pull-request
    if (!/is:(issue|pull-request)/i.test(q)) {
      q = `${q} is:issue`;
    }
    return q;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; etag?: string; rateLimit: { remaining: number; reset: number } }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "bounty-directory/1.0",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const rateLimit = {
      remaining: parseInt(response.headers.get("x-ratelimit-remaining") || "0"),
      reset: parseInt(response.headers.get("x-ratelimit-reset") || "0"),
    };

    // Get response text first to handle both JSON and non-JSON responses
    const text = await response.text();
    let json: any = null;
    
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      json = { raw: text };
    }

    if (!response.ok) {
      console.error("[GitHub API] REQUEST FAILED", { 
        url, 
        status: response.status, 
        statusText: response.statusText,
        body: json 
      });
      
      // Provide detailed error message from GitHub
      const errMsg = (json && (json.message || JSON.stringify(json))) || `HTTP ${response.status}`;
      throw new Error(`GitHub API error ${response.status}: ${errMsg}`);
    }

    const etag = response.headers.get("etag") || undefined;

    return { data: json, etag, rateLimit };
  }

  async searchIssues(
    query: string,
    page = 1,
    perPage = 100,
    sort?: string,
    order: "desc" | "asc" = "desc",
    etag?: string
  ): Promise<{ data: GitHubSearchResponse; etag?: string; rateLimit: { remaining: number; reset: number } }> {
    if (!query || typeof query !== "string") {
      throw new Error("Missing search query");
    }

    // Normalize query to ensure it includes is:issue or is:pull-request
    const normalizedQuery = this.normalizeQuery(query);

    // Sanitize per_page
    perPage = Math.min(Math.max(1, perPage), 100);

    // Build params safely using URLSearchParams
    const params = new URLSearchParams();
    params.set("q", normalizedQuery); // URLSearchParams will encode properly
    params.set("page", String(page));
    params.set("per_page", String(perPage));
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);

    const endpoint = `/search/issues?${params.toString()}`;
    const headers: Record<string, string> = {};
    
    if (etag) {
      headers["If-None-Match"] = etag;
    }

    try {
      const response = await this.request<GitHubSearchResponse>(endpoint, {
        headers,
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      return response;
    } catch (error) {
      console.error("[GitHub Search] Query failed:", { 
        originalQuery: query, 
        normalizedQuery, 
        page, 
        perPage, 
        sort, 
        order 
      });
      throw error;
    }
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    const response = await this.request<GitHubIssue>(`/repos/${owner}/${repo}/issues/${issueNumber}`);
    return response.data;
  }

  async getRepositoryLanguage(owner: string, repo: string): Promise<string | null> {
    try {
      const response = await this.request<{ language: string | null }>(`/repos/${owner}/${repo}`);
      return response.data.language;
    } catch (error) {
      console.error(`Error fetching repository language for ${owner}/${repo}:`, error);
      return null;
    }
  }
}

export function extractRepoFromUrl(repositoryUrl: string): string {
  // Extract owner/repo from repository_url like "https://api.github.com/repos/owner/repo"
  const match = repositoryUrl.match(/\/repos\/([^\/]+\/[^\/]+)/);
  return match ? match[1] : "";
}

export async function extractLanguageFromRepository(github: GitHubAPI, repositoryUrl: string): Promise<string | null> {
  try {
    const repo = extractRepoFromUrl(repositoryUrl);
    const [owner, repoName] = repo.split('/');
    
    if (!owner || !repoName) {
      return null;
    }

    const language = await github.getRepositoryLanguage(owner, repoName);
    return language;
  } catch (error) {
    console.error(`Error extracting language from repository ${repositoryUrl}:`, error);
    return null;
  }
}

// Keep the old function for backward compatibility but mark it as deprecated
export function extractLanguageFromLabels(labels: Array<{ name: string }>): string | null {
  // This function is deprecated - use extractLanguageFromRepository instead
  return null;
}