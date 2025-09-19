"use client";

import { useEffect, useState, useCallback } from "react";
import { BountyCard } from "./bounty-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { BountyIssue } from "@/app/api/bounties/route";

interface BountyListProps {
  selectedLanguage: string;
  onTotalBountiesChange: (total: number) => void;
  selectedSort: string;
  selectedLayout: string;
}

const ITEMS_PER_LOAD = 30;

const getGridClasses = (layout: string) => {
  switch (layout) {
    case "compact":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6";
    case "spacious":
      return "grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8 justify-center";
    case "comfortable":
    default:
      return "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 justify-center";
  }
};

export function BountyList({ selectedLanguage, onTotalBountiesChange, selectedSort, selectedLayout }: BountyListProps) {
  const [bounties, setBounties] = useState<BountyIssue[]>([]);
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
        limit: ITEMS_PER_LOAD.toString(),
        offset: currentOffset.toString(),
      });

      if (selectedLanguage && selectedLanguage !== "all") {
        params.append("language", selectedLanguage);
      }

      if (selectedSort) {
        params.append("sort", selectedSort);
      }

      const response = await fetch(`/api/bounties?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (isLoadMore) {
          setBounties(prev => {
            const existingIds = new Set(prev.map((bounty: BountyIssue) => bounty.id));
            const newBounties = (data.items || []).filter((bounty: BountyIssue) => !existingIds.has(bounty.id));
            return [...prev, ...newBounties];
          });
        } else {
          setBounties(data.items || []);
        }
        
        setTotalCount(data.total_count || 0);
        setHasMore(data.has_more || false);
        setOffset(data.next_offset || currentOffset + ITEMS_PER_LOAD);
        onTotalBountiesChange(data.total_count || 0);
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
      <div className={`grid ${getGridClasses(selectedLayout)}`}>
        {Array.from({ length: ITEMS_PER_LOAD }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg bg-neutral-800 border border-neutral-700" />
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
      <div className={`grid ${getGridClasses(selectedLayout)}`}>
        {bounties.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className={`grid ${getGridClasses(selectedLayout)}`}>
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={`loading-${index}`} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-lg bg-neutral-800 border border-neutral-700" />
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