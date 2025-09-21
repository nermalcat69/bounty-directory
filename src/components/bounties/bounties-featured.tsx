"use client";

import { useEffect, useState } from "react";
import { BountyCard } from "../bounty-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BountyWithAmount } from "@/app/api/bounties/route";

interface BountiesFeaturedProps {
  hidePagination?: boolean;
}

export function BountiesFeatured({ hidePagination = false }: BountiesFeaturedProps) {
  const [bounties, setBounties] = useState<BountyWithAmount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedBounties = async () => {
      try {
        const response = await fetch("/api/bounties?mode=list&page=1&limit=6&sort=updated&order=desc");
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.bounties) {
            setBounties(data.data.bounties);
          }
        }
      } catch (error) {
        console.error("Error fetching featured bounties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedBounties();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-neutral-500 font-medium">No featured bounties available</p>
          <p className="text-neutral-400 text-sm mt-1">Check back soon for new opportunities!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bounties.slice(0, 6).map((bounty) => (
        <BountyCard key={bounty.id} bounty={bounty} />
      ))}
    </div>
  );
}