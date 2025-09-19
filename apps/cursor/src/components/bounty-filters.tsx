"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BountyFiltersProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  totalBounties: number;
}

export function BountyFilters({ 
  selectedLanguage, 
  onLanguageChange, 
  totalBounties 
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
          <p className="text-sm text-gray-600">
            {totalBounties} bounties available across {languages.length} languages
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
        
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedLanguage === option.value ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full transition-all duration-200",
                selectedLanguage === option.value 
                  ? "bg-black text-white hover:bg-gray-700" 
                  : "hover:bg-gray-700"
              )}
              onClick={() => onLanguageChange(option.value)}
            >
              <span>{option.name}</span>
              {option.value === "all" && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-2 text-xs",
                    selectedLanguage === option.value 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-100"
                  )}
                >
                  {totalBounties}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}