"use client";

import { useState } from "react";
import { BountyFilters } from "./bounty-filters";
import { BountyList } from "./bounty-list";

export function BountiesSection() {
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [totalBounties, setTotalBounties] = useState(0);
  const [selectedSort, setSelectedSort] = useState("recent");

  return (
    <div className="w-full">
      {/* Filter Labels */}
      <BountyFilters
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        totalBounties={totalBounties}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
      />

      {/* Main Content - Full Width */}
      <div className="w-full">
        <BountyList
          selectedLanguage={selectedLanguage}
          onTotalBountiesChange={setTotalBounties}
          selectedSort={selectedSort}
        />
      </div>
    </div>
  );
}