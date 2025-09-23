"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BountyCard } from "./bounty-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { BountyWithAmount } from "@/app/api/bounties/route";
import { useBountyPrefetch } from "@/utils/prefetch";

interface BountyListProps {
  selectedLanguage: string;
  onTotalBountiesChange: (total: number) => void;
  selectedSort: string;
  selectedLayout: string;
}

const ITEMS_PER_LOAD = 30;

const getGridClasses = (layout: string, itemCount: number) => {
  // Adjust grid based on item count to avoid large gaps
  const getResponsiveColumns = (baseColumns: string) => {
    if (itemCount <= 2) {
      return "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2";
    }
    if (itemCount <= 4) {
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2";
    }
    if (itemCount <= 6) {
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
    }
    return baseColumns;
  };

  switch (layout) {
    case "compact":
      return `${getResponsiveColumns("grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")} gap-4`;
    case "spacious":
      return `${getResponsiveColumns("grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2")} gap-8 justify-center`;
    case "comfortable":
    default:
      return `${getResponsiveColumns("grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3")} gap-6 justify-center`;
  }
};

export function BountyList({ selectedLanguage, onTotalBountiesChange, selectedSort, selectedLayout }: BountyListProps) {
  const [bounties, setBounties] = useState<BountyWithAmount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Use ref to store the callback to avoid dependency issues
  const onTotalBountiesChangeRef = useRef(onTotalBountiesChange);
  onTotalBountiesChangeRef.current = onTotalBountiesChange;

  // Use the optimized prefetching utility
  const { prefetchNextPage } = useBountyPrefetch();

  const fetchBounties = useCallback(async (currentOffset: number, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        mode: 'list',
        page: (Math.floor(currentOffset / ITEMS_PER_LOAD) + 1).toString(),
        limit: ITEMS_PER_LOAD.toString(),
      });

      if (selectedLanguage && selectedLanguage !== "all") {
        params.append("language", selectedLanguage);
      }

      if (selectedSort) {
        // Map frontend sort values to API parameters
        switch (selectedSort) {
          case "recent":
            params.append("sort", "created");
            params.append("order", "desc");
            break;
          case "least-attempts":
            params.append("sort", "comments");
            params.append("order", "asc");
            break;
          default:
            params.append("sort", "created");
            params.append("order", "desc");
        }
      }

      const response = await fetch(`/api/bounties?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data?.bounties) {
          let updatedBounties: BountyWithAmount[];
          let newItemsCount = 0;
          
          if (isLoadMore) {
            const existingIds = new Set(bounties.map((bounty: any) => bounty.id));
            const receivedBounties = data.data.bounties;
            const newBounties = receivedBounties.filter((bounty: any) => !existingIds.has(bounty.id));
            newItemsCount = newBounties.length;
            updatedBounties = [...bounties, ...newBounties];
            setBounties(updatedBounties);
            
            console.log(`Load more: Page ${Math.floor(currentOffset / ITEMS_PER_LOAD) + 1}, Received: ${receivedBounties.length}, New: ${newItemsCount}, Existing: ${bounties.length}, Total: ${updatedBounties.length}`);
            
            // Debug: Log if we're filtering out bounties
            if (receivedBounties.length > newItemsCount) {
              const duplicateIds = receivedBounties.filter((bounty: any) => existingIds.has(bounty.id)).map((b: any) => b.id);
              console.log(`Filtered out ${receivedBounties.length - newItemsCount} duplicate bounties:`, duplicateIds.slice(0, 5));
            }
            
            // No additional processing needed for load more
          } else {
            updatedBounties = data.data.bounties;
            newItemsCount = updatedBounties.length;
            setBounties(updatedBounties);
            
            console.log(`Initial load: ${newItemsCount} items loaded`);
          }
          
          const totalCount = data.data.total?.count || 0;
          const hasMore = data.data.pagination?.hasMore || false;
          
          console.log(`Pagination: hasMore=${hasMore}, totalCount=${totalCount}, currentItems=${updatedBounties.length}`);
          
          setTotalCount(totalCount);
          setHasMore(hasMore);
          
          // Only update offset if we actually loaded new items
          if (isLoadMore && newItemsCount > 0) {
            setOffset(currentOffset + newItemsCount);
          } else if (!isLoadMore) {
            setOffset(newItemsCount);
          } else if (isLoadMore && newItemsCount === 0) {
            // No new items loaded, stop infinite scroll
            console.log("No new items loaded, setting hasMore to false");
            setHasMore(false);
          }
          
          onTotalBountiesChangeRef.current(totalCount);

          // Prefetch next page for smoother scrolling (only on initial load)
          if (hasMore && !isLoadMore) {
            const nextPage = Math.floor(currentOffset / ITEMS_PER_LOAD) + 2;
            const nextPageOptions = {
              page: nextPage,
              limit: ITEMS_PER_LOAD,
              sort: selectedSort === "recent" ? "created" : selectedSort === "least-attempts" ? "comments" : "created",
              order: selectedSort === "least-attempts" ? "asc" : "desc",
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
    threshold: 500 // Increased threshold for better UX
  });

  useEffect(() => {
    setBounties([]);
    setOffset(0);
    setHasMore(true);
    fetchBounties(0, false);
  }, [selectedLanguage, selectedSort]);

  if (loading) {
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

  if (bounties.length === 0) {
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
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
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
    <div className="space-y-6 min-h-[800px]">
      <div className={`grid ${getGridClasses(selectedLayout, bounties.length)} transition-all duration-300 ease-in-out gap-4`}>
        {bounties.map((bounty, index) => (
          <div key={bounty.id} className="animate-in fade-in slide-in-from-bottom-2 duration-400 will-change-transform" style={{ animationDelay: `${(index % 30) * 30}ms` }}>
            <BountyCard bounty={bounty} />
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      <div className={`transition-all duration-300 ${loadingMore && hasMore ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
        {loadingMore && hasMore && (
          <div className={`grid ${getGridClasses(selectedLayout, 6)} animate-in fade-in duration-300 gap-4`}>
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
        )}
      </div>

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