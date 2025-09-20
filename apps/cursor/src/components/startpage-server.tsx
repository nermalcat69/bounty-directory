import type { Section } from "@directories/data/rules";
import { type Job } from "./jobs/jobs-featured";
import { BountiesSectionServer } from "./bounties-section-server";
import { StartpageClient } from "./startpage-client";
import { Suspense } from "react";

export async function StartpageServer({
  sections,
  jobs,
  totalUsers,
  totalBountyAmount,
  members,
  popularPosts,
}: {
  sections: Section[];
  jobs?: Job[] | null;
  totalUsers: number;
  totalBountyAmount?: string;
  members: unknown[] | null;
  popularPosts: unknown[] | null;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 w-full relative mx-auto h-screen">
        <div className="transition-all duration-1000">
          {/* Client-side components for interactivity - wrapped in Suspense for useQueryState */}
          <Suspense fallback={
            <div className="flex flex-col items-center gap-8">
              <div className="w-8 h-8 animate-pulse bg-gray-300 rounded" />
              <div className="w-64 h-8 animate-pulse bg-gray-300 rounded" />
              <div className="flex gap-2">
                <div className="w-32 h-10 animate-pulse bg-gray-300 rounded-full" />
                <div className="w-32 h-10 animate-pulse bg-gray-300 rounded-full" />
              </div>
            </div>
          }>
            <StartpageClient 
              totalUsers={totalUsers}
              totalBountyAmount={totalBountyAmount}
            />
          </Suspense>

          {/* Server-side Bounties Section with ISR cached data */}
          <BountiesSectionServer />
        </div>
      </div>
    </div>
  );
}