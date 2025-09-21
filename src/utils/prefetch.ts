/**
 * Prefetch utility for background loading of bounty pages
 * Improves scrolling performance by preloading next pages
 */

interface PrefetchOptions {
  page: number;
  limit: number;
  sort: string;
  order: string;
  language?: string;
}

class BountyPrefetcher {
  private cache = new Map<string, Promise<any>>();
  private maxCacheSize = 10; // Keep last 10 prefetched pages

  private generateCacheKey(options: PrefetchOptions): string {
    const { page, limit, sort, order, language } = options;
    return `${page}-${limit}-${sort}-${order}-${language || 'all'}`;
  }

  /**
   * Prefetch the next page in background
   */
  async prefetchNextPage(currentOptions: PrefetchOptions): Promise<void> {
    const nextPageOptions = { ...currentOptions, page: currentOptions.page + 1 };
    const cacheKey = this.generateCacheKey(nextPageOptions);

    // Don't prefetch if already in cache
    if (this.cache.has(cacheKey)) {
      return;
    }

    // Clean cache if too large
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Start prefetch in background
    const prefetchPromise = this.fetchPage(nextPageOptions);
    this.cache.set(cacheKey, prefetchPromise);

    // Don't await - let it run in background
    prefetchPromise.catch(error => {
      console.warn('Prefetch failed:', error);
      this.cache.delete(cacheKey);
    });
  }

  /**
   * Get cached page or fetch if not available
   */
  async getPage(options: PrefetchOptions): Promise<any> {
    const cacheKey = this.generateCacheKey(options);
    
    if (this.cache.has(cacheKey)) {
      console.log(`Prefetch HIT: Using cached page ${options.page}`);
      return await this.cache.get(cacheKey);
    }

    // Not cached, fetch immediately
    return await this.fetchPage(options);
  }

  private async fetchPage(options: PrefetchOptions): Promise<any> {
    const { page, limit, sort, order, language } = options;
    const params = new URLSearchParams({
      mode: 'list',
      page: page.toString(),
      limit: limit.toString(),
      sort,
      order
    });
    
    if (language) {
      params.set('language', language);
    }

    const response = await fetch(`/api/bounties?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Clear all cached pages
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const bountyPrefetcher = new BountyPrefetcher();

/**
 * Hook for React components to use prefetching
 */
export function useBountyPrefetch() {
  return {
    prefetchNextPage: bountyPrefetcher.prefetchNextPage.bind(bountyPrefetcher),
    getPage: bountyPrefetcher.getPage.bind(bountyPrefetcher),
    clearCache: bountyPrefetcher.clearCache.bind(bountyPrefetcher)
  };
}