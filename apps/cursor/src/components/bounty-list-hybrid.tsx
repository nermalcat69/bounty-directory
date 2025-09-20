"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BountyCard } from "./bounty-card";
import { AdCard } from "./ad-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { BountyWithAmount } from "@/app/api/bounties/route";
import { injectAdsIntoBounties, type BountyOrAd } from "@/lib/ad-utils";
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
        recent: { sort: "updated", order: "desc" },
        oldest: { sort: "updated", order: "asc" },
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

  // Inject ads into bounties
  const bountiesWithAds: BountyOrAd[] = injectAdsIntoBounties(bounties, 6, Math.max(1, Math.floor(bounties.length / 10)));

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
        <p className="text-neutral-500 text-lg">
          {selectedLanguage !== "all" 
            ? `No bounties found for ${selectedLanguage}` 
            : "No bounties available at the moment"
          }
        </p>
        <p className="text-neutral-400 text-sm mt-2">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Bounty Grid */}
      <div className={getGridClasses(selectedLayout, bountiesWithAds.length)}>
        {bountiesWithAds.map((item, index) => {
          if (item.type === "ad") {
            return <AdCard key={item.key} ad={item.data as any} />;
          } else {
            return (
              <div
                key={item.key}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <BountyCard bounty={item.data as any} />
              </div>
            );
          }
        })}
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