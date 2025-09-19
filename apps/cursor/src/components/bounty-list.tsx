"use client";

import { useEffect, useState } from "react";
import { BountyCard } from "./bounty-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BountyIssue } from "@/app/api/bounties/route";

interface BountyListProps {
  selectedLanguage: string;
  onTotalBountiesChange: (total: number) => void;
}

const ITEMS_PER_PAGE = 12;

export function BountyList({ selectedLanguage, onTotalBountiesChange }: BountyListProps) {
  const [bounties, setBounties] = useState<BountyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchBounties = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          per_page: ITEMS_PER_PAGE.toString(),
        });

        if (selectedLanguage && selectedLanguage !== "all") {
          params.append("language", selectedLanguage);
        }

        const response = await fetch(`/api/bounties?${params}`);
        
        if (response.ok) {
          const data = await response.json();
          setBounties(data.items || []);
          setTotalCount(data.total_count || 0);
          setTotalPages(Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE));
          onTotalBountiesChange(data.total_count || 0);
        }
      } catch (error) {
        console.error("Error fetching bounties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBounties();
  }, [selectedLanguage, currentPage, onTotalBountiesChange]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
            <div key={i} className="space-y-3 p-4 border rounded-lg">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bounties found</h3>
        <p className="text-gray-600">
          {selectedLanguage === "all" 
            ? "No bounties are currently available." 
            : `No bounties found for ${selectedLanguage}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {selectedLanguage === "all" ? "All Bounties" : `${selectedLanguage} Bounties`}
        </h1>
        <p className="text-sm text-gray-600">
          {totalCount} bounties found
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bounties.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1;
              const isCurrentPage = page === currentPage;
              
              return (
                <Button
                  key={page}
                  variant={isCurrentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
            
            {totalPages > 5 && (
              <>
                <span className="px-2">...</span>
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  className="w-8 h-8 p-0"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}