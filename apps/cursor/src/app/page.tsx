import { Startpage } from "@/components/startpage";
import {
  getFeaturedJobs,
  getFeaturedMCPs,
  getPopularPosts,
  getTotalUsers,
} from "@/data/queries";
import { getTotalBountyAmount } from "@/data/bounty-queries";
import { getPopularRules } from "@directories/data/popular";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cursor Directory - Cursor Rules, MCPs & Bounties",
  description:
    "Enhance your Cursor with custom rules, find MCP servers, discover bounties, and join a community of Cursor enthusiasts.",
};

// Enable dynamic rendering to show updated bounty totals
export const dynamic = "force-dynamic";
export const revalidate = 0; // No caching - always fetch fresh data

export default async function Page() {
  const popularRules = await getPopularRules();
  
  const { data: featuredJobsData } = await getFeaturedJobs({
    onlyPremium: true,
  });

  const { data: featuredMCPsData } = await getFeaturedMCPs({
    onlyPremium: true,
  });

  // Transform the jobs data to match the Job type expected by Startpage
  const featuredJobs = featuredJobsData?.map(job => ({
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

  // Transform the MCPs data to match the MCP type expected by Startpage
  const featuredMCPs = featuredMCPsData?.map(mcp => ({
    id: mcp.id,
    name: mcp.name,
    logo: "", // No logo available in current schema
    description: mcp.description || "",
    slug: mcp.slug,
    user: {
      name: "MCP Server",
      slug: "mcp",
      image: "",
    },
  })) || null;

  const { data: totalUsers } = await getTotalUsers();
  const totalBountyAmount = await getTotalBountyAmount();

  const { data: popularPosts } = await getPopularPosts();

  return (
    <div className="flex justify-center min-h-screen w-full md:px-0 px-6 mt-[10%]">
      <div className="w-full max-w-6xl">
        <Startpage
          sections={popularRules}
          jobs={featuredJobs}
          mcps={featuredMCPs}
          totalUsers={totalUsers?.count ?? 0}
          totalBountyAmount={totalBountyAmount}
          members={null}
          popularPosts={popularPosts}
        />
      </div>
    </div>
  );
}
