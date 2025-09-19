"use client";

import type { Section } from "@directories/data/rules";
import { motion } from "motion/react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { BoardPost } from "./board/board-post";
import { GlobalSearchInput } from "./global-search-input";
import { HeroTitle } from "./hero-title";
import { type Job, JobsFeatured } from "./jobs/jobs-featured";
import MCPList from "./mcp-list";
import type { MCP } from "./mcps/mcps-featured";
import { BountiesFeatured } from "./bounties/bounties-featured";
import { BountiesSection } from "./bounties-section";

import { RuleList } from "./rule-list";
import { Cursor } from "./ui/cursor";

export function Startpage({
  sections,
  jobs,
  mcps,
  totalUsers,
  members,
  popularPosts,
}: {
  sections: Section[];
  jobs?: Job[] | null;
  mcps?: MCP[] | null;
  totalUsers: number;
  members: unknown[] | null;
  popularPosts: unknown[] | null;
}) {
  const [search] = useQueryState("q", { defaultValue: "" });

  const [sectionsPartOne, ...restSections] = sections;

  return (
    <div>
      <div className="flex flex-col gap-4 w-full relative mx-auto h-screen">
        <div className="transition-all duration-1000">
          <div
            className="flex justify-center items-center mb-8"
            style={{
              opacity: 0,
              animation: "fadeIn 0.05s ease forwards",
            }}
          >
            <Cursor />
          </div>

          <HeroTitle totalUsers={totalUsers} />

          <div className="max-w-[620px] mx-auto w-full mb-14">
            <GlobalSearchInput />
          </div>

          {/* Bounties Section with Sidebar and Main View */}
          <BountiesSection />
        </div>
      </div>
    </div>
  );
}
