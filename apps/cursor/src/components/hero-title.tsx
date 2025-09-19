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
        <h1
          className="text-[21px] mb-2"
          style={{
            opacity: 0,
            animation: "fadeIn 0.2s ease forwards",
          }}
        >
          {text}
        </h1>
        
        {bountyText && (
          <h2
            className="text-[18px] mb-4 text-green-400 font-medium"
            style={{
              opacity: 0,
              animation: "fadeIn 0.2s ease forwards 0.05s",
            }}
          >
            {bountyText}
          </h2>
        )}

      <p
        className="text-[#878787] text-sm max-w-[620px] mx-auto"
        style={{
          opacity: 0,
          animation: "fadeIn 0.2s ease forwards 0.1s",
        }}
      >
        The home for Open Source enthusiasts where you can find bounties, jobs,{" "}
        <Link href="/mcp" className="border-b border-border border-dashed">
          MCPs
        </Link>
        , post the latest news on the board, learn, connect, and
        discover{" "}
        <Link href="/jobs" className="border-b border-border border-dashed">
          jobs
        </Link>{" "}
        all in one place.
      </p>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
