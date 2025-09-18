"use client";

import { useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { SearchInput } from "../search-input";
import { Button } from "../ui/button";
import { MCPsCard } from "./mcps-card";
import type { MCP } from "./mcps-featured";

export function MCPsList({ data }: { data?: MCP[] | null }) {
  const [mcps, setMcps] = useState<MCP[]>(data ?? []);
  const [search, setSearch] = useQueryState("q");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false); // Disabled until database queries are replaced
  const observer = useRef<IntersectionObserver | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // TODO: Implement database search functionality
    console.log("Search functionality - implementation needed");
    
    // For now, just filter the existing data
    if (debouncedSearch && debouncedSearch?.length > 0) {
      const filtered = (data ?? []).filter(mcp => 
        mcp.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        mcp.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
      setMcps(filtered);
    } else {
      setMcps(data ?? []);
    }
  }, [debouncedSearch, data]);

  // Function to load more MCPs
  const loadMoreMCPs = useCallback(async () => {
    // TODO: Implement pagination functionality
    console.log("Load more functionality - implementation needed");
    return;
  }, []);

  // Setup intersection observer for infinite scroll
  const lastMCPElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreMCPs();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, loadMoreMCPs],
  );

  return (
    <div className="mt-8">
      <SearchInput
        placeholder="Search 1800+ MCPs"
        className="border-l-0 border-r-0 border-t-0 border-b-[1px] border-border px-0"
      />

      {mcps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {mcps.map((mcp, index) => (
            <div
              key={mcp.id}
              ref={index === mcps.length - 1 ? lastMCPElementRef : undefined}
            >
              <MCPsCard data={mcp} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-24 flex flex-col items-center">
          <div className="text-center text-sm text-[#878787]">
            No MCPs found
          </div>

          <Button
            variant="outline"
            className="mt-4 rounded-full border-border"
            onClick={() => setSearch(null)}
          >
            Clear search
          </Button>
        </div>
      )}

      {loading && (
        <div className="mt-8 text-center text-sm text-[#878787]">
          Loading more MCPs...
        </div>
      )}
    </div>
  );
}
