"use client";

import { motion } from "motion/react";
import { useQueryState } from "nuqs";
import { GlobalSearchInput } from "./global-search-input";
import { HeroTitle } from "./hero-title";
import { Cursor } from "./ui/cursor";

interface StartpageClientProps {
  totalUsers: number;
  totalBountyAmount?: string;
}

export function StartpageClient({ 
  totalUsers, 
  totalBountyAmount 
}: StartpageClientProps) {
  const [search] = useQueryState("q", { defaultValue: "" });

  return (
    <>
      <div
        className="flex justify-center items-center mb-8"
        style={{
          opacity: 0,
          animation: "fadeIn 0.05s ease forwards",
        }}
      >
        <Cursor />
      </div>

      <HeroTitle totalUsers={totalUsers} totalBountyAmount={totalBountyAmount} />

      <div className="max-w-[620px] mx-auto w-full mb-14">
        <GlobalSearchInput />
      </div>
    </>
  );
}