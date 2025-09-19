"use client";

import { useEffect, useState, useCallback } from "react";
import { BountyCard } from "./bounty-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { BountyWithAmount } from "@/app/api/bounties/route";

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
            params.append("sort", "updated");
            params.append("order", "desc");
            break;
          case "least-attempts":
            params.append("sort", "comments");
            params.append("order", "asc");
            break;
          default:
            params.append("sort", "updated");
            params.append("order", "desc");
        }
      }

      const response = await fetch(`/api/bounties?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data?.bounties) {
          if (isLoadMore) {
            setBounties(prev => {
              const existingIds = new Set(prev.map((bounty: any) => bounty.id));
              const newBounties = data.data.bounties.filter((bounty: any) => !existingIds.has(bounty.id));
              return [...prev, ...newBounties];
            });
          } else {
            setBounties(data.data.bounties);
          }
          
          const totalCount = data.data.total?.count || 0;
          const hasMore = data.data.pagination?.hasMore || false;
          
          setTotalCount(totalCount);
          setHasMore(hasMore);
          setOffset(currentOffset + ITEMS_PER_LOAD);
          onTotalBountiesChange(totalCount);
        }
      }
    } catch (error) {
      console.error("Error fetching bounties:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedLanguage, selectedSort, onTotalBountiesChange]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchBounties(offset, true);
    }
  }, [fetchBounties, offset, loadingMore, hasMore]);

  useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: loadMore,
    threshold: 200
  });

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchBounties(0, false);
  }, [selectedLanguage, selectedSort, fetchBounties]);

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
        <p className="text-neutral-400">
          No bounties found{selectedLanguage !== "all" ? ` for ${selectedLanguage}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`grid ${getGridClasses(selectedLayout, bounties.length)}`}>
        {bounties.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className={`grid ${getGridClasses(selectedLayout, 10)}`}>
          {Array.from({ length: 10 }).map((_, index) => (
              <div key={`loading-${index}`} className="space-y-3">
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

      {/* End of results indicator */}
      {!hasMore && bounties.length > 0 && (
        <div className="text-center py-8">
          <p className="text-neutral-500 text-sm">
            You've reached the end of the bounties list
          </p>
        </div>
      )}
    </div>
  );
}