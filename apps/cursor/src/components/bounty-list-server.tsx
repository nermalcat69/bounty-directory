import { BountyCard } from "./bounty-card";
import { AdCard } from "./ad-card";
import { fetchBountiesForISR } from "@/lib/cached-bounty-fetcher";
import { injectAdsIntoBounties, type BountyOrAd } from "@/lib/ad-utils";
import { ads } from "@/data/ads";

interface BountyListServerProps {
  selectedLanguage?: string;
  selectedSort?: string;
  selectedLayout?: string;
  limit?: number;
}

export async function BountyListServer({
  selectedLanguage = "all",
  selectedSort = "recent",
  selectedLayout = "comfortable",
  limit = 30
}: BountyListServerProps) {
  try {
    // Map sort options to API parameters
    const sortMapping: Record<string, { sort: string; order: string }> = {
      recent: { sort: "updated", order: "desc" },
      oldest: { sort: "updated", order: "asc" },
      "highest-amount": { sort: "amount", order: "desc" },
      "lowest-amount": { sort: "amount", order: "asc" },
      "least-attempts": { sort: "comments", order: "asc" },
      "most-attempts": { sort: "comments", order: "desc" },
    };

    const { sort, order } = sortMapping[selectedSort] || sortMapping.recent;

    // Fetch bounties using ISR cached data
    const bountyData = await fetchBountiesForISR({
      page: 1,
      limit,
      sort,
      order,
      language: selectedLanguage !== "all" ? selectedLanguage : undefined,
    });

    const bounties = bountyData.bounties;

    // Grid classes based on layout
    const getGridClasses = (layout: string, itemCount: number) => {
      const baseClasses = "grid gap-4 w-full";
      
      switch (layout) {
        case "compact":
          return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
        case "comfortable":
        default:
          return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
      }
    };

    if (bounties.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-neutral-500 text-lg">
            {selectedLanguage !== "all" 
              ? `No bounties found for ${selectedLanguage}` 
              : "No bounties available at the moment"
            }
          </p>
          <p className="text-neutral-400 text-sm mt-2">
            Try adjusting your filters or check back later
          </p>
        </div>
      );
    }

    // Inject ads into bounties for better monetization
    const bountiesWithAds: BountyOrAd[] = injectAdsIntoBounties(bounties, 6, 3);

    return (
      <div className="w-full">
        {/* Bounty Grid */}
        <div className={getGridClasses(selectedLayout, bountiesWithAds.length)}>
          {bountiesWithAds.map((item, index) => {
            if (item.type === "ad") {
              return <AdCard key={item.key} ad={item.data as any} />;
            } else {
              return (
                <div
                  key={item.key}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <BountyCard bounty={item.data as any} />
                </div>
              );
            }
          })}
        </div>

        {/* Note about client-side loading for more items */}
        <div className="text-center py-8 text-sm text-neutral-500">
          <p>Showing first {bounties.length} bounties</p>
          <p>Scroll down to load more bounties dynamically</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching bounties for server render:", error);
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-lg">Failed to load bounties</p>
        <p className="text-neutral-400 text-sm mt-2">
          Please refresh the page or try again later
        </p>
      </div>
    );
  }
}