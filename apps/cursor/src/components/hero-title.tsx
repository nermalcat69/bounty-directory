"use client";

import { formatNumber } from "@/utils/format";
import Link from "next/link";

export function HeroTitle({ 
  totalUsers, 
  totalBountyAmount 
}: { 
  totalUsers: number;
  totalBountyAmount?: string;
}) {
  const text = `Join the Bounty community with ${formatNumber(totalUsers)}+ members`;
  const bountyText = totalBountyAmount ? `${totalBountyAmount} in rewards in open source contributions` : '';

  return (
    <div className="text-center mb-8">
      {/* Main title - loads immediately */}
      <h1 className="text-[21px] mb-2">
        {text}
      </h1>
      
      {/* Bounty amount - shows skeleton when loading */}
      <div className="h-[26px] mb-4 flex justify-center items-center">
        {totalBountyAmount ? (
          <h2 className="text-[18px] text-green-400 font-medium animate-in fade-in duration-300">
            {bountyText}
          </h2>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="h-[18px] w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <span className="text-[18px] text-gray-400">in rewards in open source contributions</span>
          </div>
        )}
      </div>

      {/* Description - loads immediately */}
      <p className="text-[#878787] text-sm max-w-[620px] mx-auto">
        The home for Open Source enthusiasts where you can find bounties, jobs,{" "}
         post the latest news on the board, learn, connect, and
        discover{" "}
        <Link href="/jobs" className="border-b border-border border-dashed">
          jobs
        </Link>{" "}
        all in one place.
      </p>
    </div>
  );
}
