import { BountyFiltersClient } from "@components/bounty-filters-client";
import { fetchBountiesForISR } from "@/lib/server-bounty-fetcher";

export async function BountiesSectionServer() {
  try {
    // Fetch initial bounties using ISR cached data
    const bountyData = await fetchBountiesForISR({
      page: 1,
      limit: 30,
      sort: 'updated',
      order: 'desc'
    });

    const initialBounties = bountyData.bounties;
    const initialTotal = bountyData.total.count;

    return (
      <div className="w-full">
        {/* Client Component handles both filters and bounty list with initial data */}
        <BountyFiltersClient
          initialTotalBounties={initialTotal}
          initialBounties={initialBounties}
        />
      </div>
    );
  } catch (error) {
    console.error("Error fetching initial bounties:", error);
    
    // Fallback to client-side only component
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">Failed to load initial bounties</p>
          <p className="text-neutral-400 text-sm mt-2">
            Loading bounties dynamically...
          </p>
        </div>
        
        {/* Fallback to original client component */}
        <BountyFiltersClient 
          initialTotalBounties={0} 
          initialBounties={[]}
        />
      </div>
    );
  }
}