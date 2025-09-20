import { BountyCard } from "../bounty-card";
import { fetchBountiesForISR } from "@/lib/cached-bounty-fetcher";

interface BountiesFeaturedServerProps {
  hidePagination?: boolean;
  limit?: number;
}

export async function BountiesFeaturedServer({ 
  hidePagination = false, 
  limit = 6 
}: BountiesFeaturedServerProps) {
  try {
    // Fetch bounties using ISR cached data
    const bountyData = await fetchBountiesForISR({
      page: 1,
      limit,
      sort: 'updated',
      order: 'desc'
    });

    const bounties = bountyData.bounties;

    if (bounties.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No bounties available at the moment.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bounties.slice(0, limit).map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} />
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error fetching featured bounties:", error);
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load bounties. Please try again later.</p>
      </div>
    );
  }
}