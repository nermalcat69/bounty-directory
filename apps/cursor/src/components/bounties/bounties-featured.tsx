"use client";

import { useEffect, useState } from "react";
import { BountyCard } from "../bounty-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BountyIssue } from "@/app/api/bounties/route";

interface BountiesFeaturedProps {
  hidePagination?: boolean;
}

export function BountiesFeatured({ hidePagination = false }: BountiesFeaturedProps) {
  const [bounties, setBounties] = useState<BountyIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedBounties = async () => {
      try {
        const response = await fetch("/api/bounties?page=1&per_page=6");
        
        if (response.ok) {
          const data = await response.json();
          setBounties(data.items || []);
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
        <p className="text-gray-600">No bounties available at the moment.</p>
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