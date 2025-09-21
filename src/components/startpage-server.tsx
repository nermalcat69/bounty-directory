import { BountiesSectionServer } from "./bounties-section-server";
import { StartpageClient } from "./startpage-client";

interface StartpageServerProps {
  totalUsers: number;
  totalBountyAmount?: string;
}

export async function StartpageServer({
  totalUsers,
  totalBountyAmount,
}: StartpageServerProps) {
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