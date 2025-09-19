"use client";

import { useState } from "react";
import { BountyFilters } from "./bounty-filters";
import { BountyListHybrid } from "./bounty-list-hybrid";

interface BountyFiltersClientProps {
  initialTotalBounties: number;
  initialBounties?: any[];
}

export function BountyFiltersClient({ 
  initialTotalBounties,
  initialBounties = []
}: BountyFiltersClientProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [totalBounties, setTotalBounties] = useState(initialTotalBounties);
  const [selectedSort, setSelectedSort] = useState("recent");
  const [selectedLayout, setSelectedLayout] = useState("comfortable");

  return (
    <>
      {/* Filter Labels */}
      <BountyFilters
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        totalBounties={totalBounties}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        selectedLayout={selectedLayout}
        onLayoutChange={setSelectedLayout}
      />

      {/* Main Content - Hybrid Component with Server-Side Initial Data */}
      <div className="w-full">
        <BountyListHybrid
          selectedLanguage={selectedLanguage}
          onTotalBountiesChange={setTotalBounties}
          selectedSort={selectedSort}
          selectedLayout={selectedLayout}
          initialBounties={initialBounties}
          initialTotal={initialTotalBounties}
        />
      </div>
    </>
  );
}