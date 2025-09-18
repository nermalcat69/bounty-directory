import { MCPsFeatured } from "@/components/mcps/mcps-featured";
import { MCPsList } from "@/components/mcps/mcps-list";
import { getFeaturedMCPs, getMCPs } from "@/data/queries";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "MCP Servers for Cursor",
  description: "MCP Servers",
};

export const revalidate = 3600;

export default async function Page() {
  const { data: featuredMCPs } = await getFeaturedMCPs();
  const { data: mcps } = await getMCPs();

  // Transform the data to match the MCP type expected by MCPsFeatured and MCPsList
  const transformedFeaturedMCPs = featuredMCPs?.map(mcp => ({
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

  const transformedMCPs = mcps?.map(mcp => ({
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

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12 md:mt-24 pb-32">
      <h1 className="text-xl mb-2">Featured MCPs</h1>
      <p className="text-sm text-[#878787] mb-8">
        Browse MCPs or{" "}
        <Link href="/mcp/new" className="border-b border-border border-dashed">
          post a MCP to reach 250,000+ monthly active developers
        </Link>
        .
      </p>

      <MCPsFeatured data={transformedFeaturedMCPs} />
      <Suspense fallback={null}>
        <MCPsList data={transformedMCPs} />
      </Suspense>
    </div>
  );
}
