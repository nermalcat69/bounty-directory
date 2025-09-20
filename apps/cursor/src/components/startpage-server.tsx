import type { Section } from "@directories/data/rules";
import { type Job } from "./jobs/jobs-featured";
import { BountiesSectionServer } from "./bounties-section-server";
import { StartpageClient } from "./startpage-client";
import { FreelanceFeaturedServer } from "./freelance/freelance-featured-server";
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
          {/* Client-side components for interactivity */}
          <Suspense fallback={<div>Loading...</div>}>
            <StartpageClient 
              totalUsers={totalUsers}
              totalBountyAmount={totalBountyAmount}
            />
          </Suspense>

          {/* Server-side Bounties Section with ISR cached data */}
          <BountiesSectionServer />

          {/* Freelance Featured Section */}
          <div className="mt-16 max-w-screen-xl mx-auto px-6">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">Featured Freelance Projects</h2>
              <p className="text-sm text-[#878787]">
                Discover exciting freelance opportunities from top companies
              </p>
            </div>
            <Suspense fallback={<div>Loading freelance projects...</div>}>
              <FreelanceFeaturedServer limit={6} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}