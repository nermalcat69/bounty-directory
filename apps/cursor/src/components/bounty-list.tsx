"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BountyCard } from "./bounty-card";
import { AdCard } from "./ad-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { BountyWithAmount } from "@/app/api/bounties/route";
import { injectAdsIntoBounties, type BountyOrAd } from "@/lib/ad-utils";
import type { Ad } from "@/data/ads";
import { ads } from "@/data/ads";

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
  const [displayItems, setDisplayItems] = useState<BountyOrAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Use ref to store the callback to avoid dependency issues
  const onTotalBountiesChangeRef = useRef(onTotalBountiesChange);
  onTotalBountiesChangeRef.current = onTotalBountiesChange;

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
          let updatedBounties: BountyWithAmount[];
          let newItemsCount = 0;
          
          if (isLoadMore) {
            const existingIds = new Set(bounties.map((bounty: any) => bounty.id));
            const newBounties = data.data.bounties.filter((bounty: any) => !existingIds.has(bounty.id));
            newItemsCount = newBounties.length;
            updatedBounties = [...bounties, ...newBounties];
            setBounties(updatedBounties);
            
            console.log(`Load more: Page ${Math.floor(currentOffset / ITEMS_PER_LOAD) + 1}, New items: ${newItemsCount}, Total items: ${updatedBounties.length}`);
            
            // For load more, preserve existing display items and add new ones with potential ads
            if (newItemsCount > 0) {
              setDisplayItems(prevItems => {
                const currentBountyCount = bounties.length; // Count before adding new items
                const newItemsWithAds: BountyOrAd[] = [];
                
                newBounties.forEach((bounty: BountyWithAmount, index: number) => {
                  // Add the bounty
                  newItemsWithAds.push({
                    type: 'bounty' as const,
                    data: bounty,
                    key: `bounty-${bounty.id}`
                  });
                  
                  // Check if we should add an ad after this bounty
                  const globalPosition = currentBountyCount + index;
                  const shouldInjectAd = (globalPosition + 1) % 6 === 0; // Every 6th item
                  
                  if (shouldInjectAd) {
                    const randomAd = ads[globalPosition % ads.length]; // Simple rotation
                    newItemsWithAds.push({
                      type: 'ad' as const,
                      data: randomAd,
                      key: `ad-${randomAd.id}-${globalPosition}`
                    });
                  }
                });
                
                return [...prevItems, ...newItemsWithAds];
              });
            }
          } else {
            updatedBounties = data.data.bounties;
            newItemsCount = updatedBounties.length;
            setBounties(updatedBounties);
            
            console.log(`Initial load: ${newItemsCount} items loaded`);
            
            // For initial load, inject ads into the full list
            const itemsWithAds = injectAdsIntoBounties(updatedBounties, 6, 3);
            setDisplayItems(itemsWithAds);
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
    if (!loadingMore && hasMore) {
      fetchBounties(offset, true);
    }
  }, [fetchBounties, offset, loadingMore, hasMore]);

  useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: loadMore,
    threshold: 500 // Increased threshold for better UX
  });

  useEffect(() => {
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

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400">
          No bounties found{selectedLanguage !== "all" ? ` for ${selectedLanguage}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-[800px]">
      <div className={`grid ${getGridClasses(selectedLayout, displayItems.length)} transition-all duration-300 ease-in-out gap-4`}>
        {displayItems.map((item, index) => {
          if (item.type === 'bounty') {
            return (
              <div key={item.key} className="animate-in fade-in slide-in-from-bottom-2 duration-400 will-change-transform" style={{ animationDelay: `${(index % 30) * 30}ms` }}>
                <BountyCard bounty={item.data as BountyWithAmount} />
              </div>
            );
          } else {
            return (
              <div key={item.key} className="animate-in fade-in slide-in-from-bottom-2 duration-400 will-change-transform" style={{ animationDelay: `${(index % 30) * 30}ms` }}>
                <AdCard ad={item.data as Ad} />
              </div>
            );
          }
        })}
      </div>

      {/* Loading more indicator */}
      <div className={`transition-all duration-300 ${loadingMore ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
        {loadingMore && (
          <div className={`grid ${getGridClasses(selectedLayout, 10)} animate-in fade-in duration-300 gap-4`}>
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={`loading-${index}`} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform" style={{ animationDelay: `${index * 50}ms` }}>
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