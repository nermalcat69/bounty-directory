"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, DollarSign, Filter } from "lucide-react";
import { useEffect, useState } from "react";

interface BountySidebarProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  totalBounties: number;
}

export function BountySidebar({ 
  selectedLanguage, 
  onLanguageChange, 
  totalBounties 
}: BountySidebarProps) {
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
          // Filter to only allowed languages
          const allowedLanguages = ["C++", "Go", "HCL", "JavaScript", "PHP", "Ruby", "Rust", "Scala", "TypeScript"];
          const filteredLanguages = (data.languages || []).filter((lang: string) => 
            allowedLanguages.includes(lang)
          );
          setLanguages(filteredLanguages);
        }
      } catch (error) {
        console.error("Error fetching languages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  // Hardcode language order with priority languages first
  const priorityLanguages = ["TypeScript", "Rust", "Go", "Ruby"];
  const otherLanguages = languages.filter(lang => !priorityLanguages.includes(lang)).sort();
  const orderedLanguages = [...priorityLanguages.filter(lang => languages.includes(lang)), ...otherLanguages];

  const languageOptions = [
    { name: "All Languages", value: "all", count: totalBounties },
    ...orderedLanguages.map(lang => ({ name: lang, value: lang.toLowerCase(), count: 0 }))
  ];

  return (
    <aside className="w-64 p-4 flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-lg">Bounties</h2>
        </div>
        <p className="text-sm text-gray-600">
          Find open source bounties and earn rewards
        </p>
      </div>

      <ScrollArea className="flex-grow">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Language</span>
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            languageOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedLanguage === option.value ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => onLanguageChange(option.value)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option.name}</span>
                  {option.value === "all" && (
                    <Badge variant="secondary" className="ml-auto">
                      {totalBounties}
                    </Badge>
                  )}
                </div>
              </Button>
            ))
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Quick Stats</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Bounties:</span>
              <span className="font-medium">{totalBounties}</span>
            </div>
            <div className="flex justify-between">
              <span>Languages:</span>
              <span className="font-medium">{languages.length}</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      <Separator className="my-4" />
      
      <div className="space-y-2">
        <a
          href="https://github.com/search?q=label%3A%22💎+Bounty%22&type=issues"
          target="_blank"
          rel="noreferrer"
        >
          <Button
            className="w-full bg-[#F5F5F3]/30 text-black border border-black rounded-full items-center justify-center gap-2 font-medium dark:text-white dark:border-white"
            variant="outline"
          >
            <span>View on GitHub</span>
            <PlusIcon className="w-4 h-4" />
          </Button>
        </a>
        
        <a
          href="https://github.com/pontusab/bounty.directory"
          target="_blank"
          rel="noreferrer"
        >
          <Button
            className="w-full"
            variant="ghost"
          >
            <span className="text-sm">Submit a Bounty</span>
          </Button>
        </a>
      </div>
    </aside>
  );
}