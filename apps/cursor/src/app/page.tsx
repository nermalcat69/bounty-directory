import { StartpageServer } from "@/components/startpage-server";
import {
  getCachedPopularRules,
  getCachedFeaturedJobs,
  getCachedTotalUsers,
  getCachedTotalBountyAmount,
  getCachedPopularPosts,
} from "@/data/cached-queries";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Cursor Directory - Cursor Rules & Bounties",
  description:
    "Enhance your Cursor with custom rules, discover bounties, and join a community of Cursor enthusiasts.",
};

// Enable ISR with 5-minute revalidation for better performance
export const revalidate = 300; // Revalidate every 5 minutes

export default async function Page() {
  const popularRules = await getCachedPopularRules();
  
  const { data: featuredJobsData } = await getCachedFeaturedJobs({
    onlyPremium: true,
  });

  // Transform the jobs data to match the Job type expected by Startpage
  const featuredJobs = featuredJobsData?.map((job: any) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    company: {
      name: job.company.name,
      slug: job.company.slug,
      image: job.company.image || "",
    },
    workplace: job.workplace,
    link: job.link,
  })) || null;

  const { data: totalUsers } = await getCachedTotalUsers();
  const totalBountyAmount = await getCachedTotalBountyAmount();

  const { data: popularPosts } = await getCachedPopularPosts();

  return (
    <div className="flex justify-center min-h-screen w-full md:px-0 px-6 mt-[10%]">
      <div className="w-full max-w-6xl">
        <StartpageServer
          sections={popularRules}
          jobs={featuredJobs}
          totalUsers={totalUsers?.count ?? 0}
          totalBountyAmount={totalBountyAmount}
          members={null}
          popularPosts={popularPosts}
        />
      </div>
    </div>
  );
}
