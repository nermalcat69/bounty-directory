"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Grid3X3, LayoutGrid, Grid2X2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BountyFiltersProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  totalBounties: number;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  selectedLayout: string;
  onLayoutChange: (layout: string) => void;
}

export function BountyFilters({ 
  selectedLanguage, 
  onLanguageChange, 
  totalBounties,
  selectedSort,
  onSortChange,
  selectedLayout,
  onLayoutChange
}: BountyFiltersProps) {
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch("/api/bounties", {
          method: "POST",
        });
        
        if (response.ok) {
          const data = await response.json();
          setLanguages(data.languages || []);
        }
      } catch (error) {
        console.error("Error fetching languages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  const languageOptions = [
    { name: "All Languages", value: "all", count: totalBounties },
    ...languages.map(lang => ({ name: lang, value: lang.toLowerCase(), count: 0 }))
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-lg">Filter Bounties</h2>
          </div>
          <p className="text-sm text-neutral-500">
            {selectedLanguage === "all" 
              ? `${totalBounties} bounties available across ${languages.length} languages`
              : `${totalBounties} bounties available in ${selectedLanguage}`
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <a
            href="https://github.com/search?q=label%3A%22💎+Bounty%22&type=issues"
            target="_blank"
            className="px-6 py-2 text-sm rounded-full font-medium whitespace-nowrap flex items-center gap-2 border border-border"
            rel="noreferrer"
          >
              <span>View on GitHub</span>
              <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Filter Labels */}
      <div className="space-y-3">
        
        <div className="flex flex-wrap gap-2 items-center">
          {languageOptions.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              className={cn(
                "rounded-full transition-all duration-200",
                selectedLanguage === option.value 
                  ? "bg-neutral-900 text-white hover:bg-neutral-700" 
                  : "hover:bg-neutral-900"
              )}
              onClick={() => onLanguageChange(option.value)}
            >
              <span>{option.name}</span>
            </Button>
          ))}
          
          {/* Layout Toggle and Sort Dropdown */}
          <div className="ml-auto flex items-center gap-3">
            {/* Layout Toggle Buttons */}
            <div className="flex items-center border border-border rounded-full p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-full",
                  selectedLayout === "compact" 
                    ? "bg-neutral-900 text-white hover:bg-neutral-700" 
                    : "hover:bg-neutral-100"
                )}
                onClick={() => onLayoutChange("compact")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-full",
                  selectedLayout === "comfortable" 
                    ? "bg-neutral-900 text-white hover:bg-neutral-700" 
                    : "hover:bg-neutral-100"
                )}
                onClick={() => onLayoutChange("comfortable")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-full",
                  selectedLayout === "spacious" 
                    ? "bg-neutral-900 text-white hover:bg-neutral-700" 
                    : "hover:bg-neutral-100"
                )}
                onClick={() => onLayoutChange("spacious")}
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Sort Dropdown */}
            <Select value={selectedSort} onValueChange={onSortChange}>
              <SelectTrigger className="w-[180px] space-x-1 flex rounded-full">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="least-attempts">Least Attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}