/**
 * Example React component showing how to use the bounty prefetching utility
 * This demonstrates background loading for smoother pagination
 */

import React, { useState, useEffect } from 'react';
import { useBountyPrefetch } from '@/utils/prefetch';

interface BountyListProps {
  initialPage?: number;
  limit?: number;
  sort?: string;
  order?: string;
  language?: string;
}

export function BountyListWithPrefetch({
  initialPage = 1,
  limit = 30,
  sort = 'created',
  order = 'desc',
  language
}: BountyListProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { prefetchNextPage, getPage } = useBountyPrefetch();

  const loadPage = async (page: number) => {
    setLoading(true);
    try {
      const options = { page, limit, sort, order, language };
      
      // Get page (from cache if available, otherwise fetch)
      const response = await getPage(options);
      
      if (response.success) {
        setBounties(response.data.bounties);
        setHasMore(response.data.pagination.hasMore);
        
        // Prefetch next page in background for smoother scrolling
        if (response.data.pagination.hasMore) {
          prefetchNextPage(options);
        }
      }
    } catch (error) {
      console.error('Failed to load bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial page
  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage, sort, order, language]);

  const handleNextPage = () => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Intersection Observer for infinite scroll (optional)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          handleNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div className="bounty-list">
      {/* Bounty cards */}
      <div className="grid gap-4">
        {bounties.map((bounty) => (
          <div key={bounty.id} className="bounty-card p-4 border rounded-lg">
            <h3 className="font-semibold">{bounty.title}</h3>
            <p className="text-sm text-gray-600">{bounty.repo}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-green-600 font-bold">{bounty.amount}</span>
              <span className="text-xs text-gray-500">
                {new Date(bounty.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1 || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        
        <span className="text-sm text-gray-600">
          Page {currentPage}
        </span>
        
        <button
          onClick={handleNextPage}
          disabled={!hasMore || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Infinite scroll sentinel */}
      <div id="scroll-sentinel" className="h-4"></div>
    </div>
  );
}

export default BountyListWithPrefetch;