import { BountyPage } from "@/components/bounty-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bounties - Cursor Directory",
  description:
    "Discover and earn from open source bounties. Find GitHub issues with rewards and contribute to projects you love.",
};

export default function BountiesPage() {
  return <BountyPage />;
}