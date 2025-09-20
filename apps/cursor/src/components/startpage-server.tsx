import type { Section } from "@directories/data/rules";
import { type Job } from "./jobs/jobs-featured";
import { BountiesSectionServer } from "./bounties-section-server";
import { StartpageClient } from "./startpage-client";

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
          {/* Client-side components for interactivity - no Suspense needed */}
          <StartpageClient 
            totalUsers={totalUsers}
            totalBountyAmount={totalBountyAmount}
          />

          {/* Server-side Bounties Section with ISR cached data */}
          <BountiesSectionServer />
        </div>
      </div>
    </div>
  );
}