"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BountyCard } from "./bounty-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { BountyWithAmount } from "@/app/api/bounties/route";
import { useBountyPrefetch } from "@/utils/prefetch";

interface BountyListHybridProps {
  selectedLanguage: string;
  onTotalBountiesChange: (total: number) => void;
  selectedSort: string;
  selectedLayout: string;
  initialBounties?: BountyWithAmount[];
  initialTotal?: number;
}

const ITEMS_PER_LOAD = 30;

export function BountyListHybrid({
  selectedLanguage,
  onTotalBountiesChange,
  selectedSort,
  selectedLayout,
  initialBounties = [],
  initialTotal = 0,
}: BountyListHybridProps) {
  const [bounties, setBounties] = useState<BountyWithAmount[]>(initialBounties);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(initialBounties.length);
  const [hasMore, setHasMore] = useState(initialBounties.length < initialTotal);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const onTotalBountiesChangeRef = useRef(onTotalBountiesChange);

  const { prefetchNextPage } = useBountyPrefetch();

  // Update ref when prop changes
  useEffect(() => {
    onTotalBountiesChangeRef.current = onTotalBountiesChange;
  }, [onTotalBountiesChange]);

  // Grid classes based on layout
  const getGridClasses = (layout: string, itemCount: number) => {
    const baseClasses = "grid gap-4 w-full";
    
    switch (layout) {
      case "compact":
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
      case "comfortable":
      default:
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
    }
  };

  const fetchBounties = useCallback(async (currentOffset: number, isLoadMore: boolean = false) => {

    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const sortMapping: Record<string, { sort: string; order: string }> = {
        recent: { sort: "created", order: "desc" },
        oldest: { sort: "created", order: "asc" },
        "highest-amount": { sort: "amount", order: "desc" },
        "lowest-amount": { sort: "amount", order: "asc" },
        "least-attempts": { sort: "comments", order: "asc" },
        "most-attempts": { sort: "comments", order: "desc" },
      };

      const { sort, order } = sortMapping[selectedSort] || sortMapping.recent;
      const page = Math.floor(currentOffset / ITEMS_PER_LOAD) + 1;

      const params = new URLSearchParams({
        mode: "list",
        page: page.toString(),
        limit: ITEMS_PER_LOAD.toString(),
        sort,
        order,
        ...(selectedLanguage !== "all" && { language: selectedLanguage }),
      });

      const response = await fetch(`/api/bounties?${params}`);
      
      if (response.ok) {
        const data = await response.json();

        
        if (data.success && data.data?.bounties) {
          const newBounties = data.data.bounties;
          const newItemsCount = newBounties.length;
          
          if (isLoadMore) {
            // Use functional state update to avoid dependency on bounties
            setBounties(prevBounties => {
              const existingIds = new Set(prevBounties.map((b: BountyWithAmount) => b.id));
              const uniqueNewBounties = newBounties.filter((b: BountyWithAmount) => !existingIds.has(b.id));

              return [...prevBounties, ...uniqueNewBounties];
            });
          } else {
            setBounties(newBounties);

          }
          
          const totalCount = data.data.total?.count || 0;
          const hasMore = data.data.pagination?.hasMore || false;
          
          setTotalCount(totalCount);
          setHasMore(hasMore);

          
          // Only update offset if we actually loaded new items
          if (isLoadMore && newItemsCount > 0) {
            setOffset(currentOffset + newItemsCount);

          } else if (!isLoadMore) {
            setOffset(newItemsCount);

          } else if (isLoadMore && newItemsCount === 0) {
            setHasMore(false);

          }
          
          onTotalBountiesChangeRef.current(totalCount);

          // Prefetch next page for smoother scrolling (only on initial load)
          if (hasMore && !isLoadMore) {
            const nextPage = Math.floor(currentOffset / ITEMS_PER_LOAD) + 2;
            const nextPageOptions = {
              page: nextPage,
              limit: ITEMS_PER_LOAD,
              sort,
              order,
              language: selectedLanguage !== "all" ? selectedLanguage : undefined,
            };
            prefetchNextPage(nextPageOptions);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching bounties:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedLanguage, selectedSort]);

  const loadMore = useCallback(() => {
    // Early return if already loading, no more items, or if we're at the end
    if (loadingMore || !hasMore || loading) {
      return;
    }
    
    fetchBounties(offset, true);
  }, [fetchBounties, offset, loadingMore, hasMore, loading]);

  useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: loadMore,
    threshold: 500
  });

  // Reset and fetch when filters change
  useEffect(() => {
    // Always reset and fetch when language or sort changes

    setBounties([]);
    setOffset(0);
    setHasMore(true);
    fetchBounties(0, false);
  }, [selectedLanguage, selectedSort, fetchBounties]);

  // Update total bounties when component mounts
  useEffect(() => {
    onTotalBountiesChangeRef.current(totalCount);
  }, [totalCount]);

  // Use bounties directly without ads

  if (loading && bounties.length === 0) {
    return (
      <div className={`grid ${getGridClasses(selectedLayout, ITEMS_PER_LOAD)}`}>
        {Array.from({ length: ITEMS_PER_LOAD }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="h-[280px] w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 animate-pulse">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 h-full flex flex-col">
                <div className="h-6 bg-neutral-800 rounded mb-3 flex-shrink-0"></div>
                <div className="bg-neutral-800 rounded mb-3 flex-shrink-0" style={{ height: '84px' }}></div>
                <div className="h-5 bg-neutral-800 rounded w-1/2 mb-3 flex-shrink-0"></div>
                <div className="flex-1"></div>
                <div className="h-8 bg-neutral-800 rounded w-3/4 flex-shrink-0"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bounties.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-neutral-500 text-lg font-medium">
            {selectedLanguage !== "all" 
              ? `No bounties found for ${selectedLanguage}` 
              : "No bounties available at the moment"
            }
          </p>
          <p className="text-neutral-400 text-sm mt-2">
            {selectedLanguage !== "all" 
              ? "Try selecting 'All Languages' or check back later as we discover new bounties"
              : "We're actively discovering new bounties from GitHub. Check back soon!"
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="https://github.com/search?q=label%3A%22💎+Bounty%22&type=issues"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Browse GitHub Bounties
          </a>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Bounty Grid */}
      <div className={getGridClasses(selectedLayout, bounties.length)}>
        {bounties.map((bounty, index) => (
           <div
             key={bounty.id}
             className="animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform"
             style={{ animationDelay: `${index * 50}ms` }}
           >
             <BountyCard bounty={bounty} />
           </div>
         ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && hasMore && (
        <div className="py-8">
          <div className={`grid ${getGridClasses(selectedLayout, 6)}`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`loading-${index}`} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 will-change-transform" style={{ animationDelay: `${index * 25}ms` }}>
                <div className="h-[280px] w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 animate-pulse">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 h-full flex flex-col">
                    <div className="h-6 bg-neutral-800 rounded mb-3 flex-shrink-0"></div>
                    <div className="bg-neutral-800 rounded mb-3 flex-shrink-0" style={{ height: '84px' }}></div>
                    <div className="h-5 bg-neutral-800 rounded w-1/2 mb-3 flex-shrink-0"></div>
                    <div className="flex-1"></div>
                    <div className="h-8 bg-neutral-800 rounded w-3/4 flex-shrink-0"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && bounties.length > 0 && !loadingMore && (
        <div className="text-center py-8 animate-in fade-in duration-500">
          <p className="text-neutral-500 text-sm">
            You've reached the end of the bounties list
          </p>
        </div>
      )}
    </div>
  );
}