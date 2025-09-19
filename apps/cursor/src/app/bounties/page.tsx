import { BountyPage } from "@/components/bounty-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bounties - Cursor Directory",
  description:
    "Discover and earn from open source bounties. Find GitHub issues with rewards and contribute to projects you love.",
};

// Enable ISR with 5-minute revalidation for better performance
export const revalidate = 300; // Revalidate every 5 minutes

// Tags for on-demand revalidation
export const tags = ['bounties', 'bounty-list'];

export default function BountiesPage() {
  return <BountyPage />;
}