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
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-neutral-500 text-lg font-medium">
              {selectedLanguage !== "all" 
                ? `No bounties found for ${selectedLanguage}` 
                : "No bounties available at the moment"
              }
            </p>
            <p className="text-neutral-400 text-sm mt-2">
              {selectedLanguage !== "all" 
                ? "Try selecting 'All Languages' or check back later as we discover new bounties"
                : "We're actively discovering new bounties from GitHub. Check back soon!"
              }
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="https://github.com/search?q=label%3A%22💎+Bounty%22&type=issues"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Browse GitHub Bounties
            </a>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors duration-200"
            >
              Refresh Page
            </button>
          </div>
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