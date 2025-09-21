"use client";

import { useState } from "react";
import { BountySidebar } from "./bounty-sidebar";
import { BountyList } from "./bounty-list";

export function BountyPage() {
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [totalBounties, setTotalBounties] = useState(0);
  const [selectedSort, setSelectedSort] = useState("recent");
  const [selectedLayout, setSelectedLayout] = useState("comfortable");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="hidden md:block">
            <div className="sticky top-8">
              <BountySidebar
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                totalBounties={totalBounties}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <BountyList
              selectedLanguage={selectedLanguage}
              onTotalBountiesChange={setTotalBounties}
              selectedSort={selectedSort}
              selectedLayout={selectedLayout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}