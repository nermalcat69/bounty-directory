import { BountiesSectionServer } from "./bounties-section-server";
import { StartpageClient } from "./startpage-client";

export async function StartpageServer({
  totalUsers,
  totalBountyAmount,
}: {
  totalUsers: number;
  totalBountyAmount?: string;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 w-full relative mx-auto h-screen">
        <div className="transition-all duration-1000">
          {/* Client-side components for interactivity */}
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