import { StartpageServer } from "@/components/startpage-server";
import {
  getCachedTotalUsers,
  getCachedTotalBountyAmount,
} from "@/data/cached-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bounty Directory - Cursor Rules & Bounties",
  description:
    "Enhance your Cursor with custom rules, discover bounties, and join a community of Cursor enthusiasts.",
};

// Enable ISR with 5-minute revalidation for better performance
export const revalidate = 300; // Revalidate every 5 minutes

export default async function Page() {
  const { data: totalUsers } = await getCachedTotalUsers();
  const totalBountyAmount = await getCachedTotalBountyAmount();

  return (
    <div className="flex justify-center min-h-screen w-full md:px-0 px-6 mt-[10%]">
      <div className="w-full max-w-6xl">
        <StartpageServer
          totalUsers={totalUsers?.count ?? 0}
          totalBountyAmount={totalBountyAmount}
        />
      </div>
    </div>
  );
}
