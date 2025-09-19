import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ExternalLink, Star, GitBranch, DollarSign } from "lucide-react";
import type { BountyWithAmount } from "@/app/api/bounties/route";

export function BountyCard({ bounty, isPage }: { bounty: BountyWithAmount; isPage?: boolean }) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatStarCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
  };

  return (
    <Link 
      href={bounty.html_url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block h-full"
    >
      <Card
        className={cn(
          "bg-neutral-950 border-neutral-800 p-3 h-[280px] w-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] hover:border-neutral-700",
        )}
      >
        <CardContent
          className={cn(
            "bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-sm opacity-70 hover:opacity-100 transition-opacity group relative h-full flex flex-col",
            isPage && "opacity-100",
          )}
        >
          {/* Header with repository info and bounty amount - Fixed height */}
          <div className="flex items-center justify-between mb-3 h-6 flex-shrink-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <GitBranch className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span className="text-xs text-neutral-400 truncate overflow-hidden">
                {bounty.repo}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {bounty.amount && (
                <div className="flex items-center space-x-1 bg-green-900/30 border border-green-700/50 px-2 py-1 rounded-full">
                  <span className="text-xs text-green-400 font-medium">
                    {bounty.amount}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Title - Fixed height with overflow handling */}
          <div className="mb-3 flex-shrink-0" style={{ height: '84px' }}>
            <h3 className="font-semibold text-neutral-100 text-sm leading-tight line-clamp-4 break-words overflow-hidden h-full">
              {bounty.title}
            </h3>
          </div>

          {/* Language - Fixed height */}
          <div className="flex items-center space-x-2 mb-3 h-5 flex-shrink-0">
            {bounty.language ? (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: getLanguageColor(bounty.language)
                  }}
                />
                <span className="text-xs text-neutral-400">{bounty.language}</span>
              </>
            ) : (
              <div className="w-3 h-3" />
            )}
          </div>

          {/* Spacer to push footer to bottom */}
          <div className="flex-1"></div>

          {/* Footer with author and date - Fixed height at bottom */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-700 h-8 flex-shrink-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Avatar className="w-5 h-5 flex-shrink-0">
                <img src={`https://github.com/${bounty.user_login}.png`} alt={bounty.user_login} />
              </Avatar>
              <span className="text-xs text-neutral-400 truncate overflow-hidden">{bounty.user_login}</span>
            </div>
            <span className="text-xs text-neutral-500">
              {formatDate(bounty.updated_at instanceof Date ? bounty.updated_at.toISOString() : bounty.updated_at)}
            </span>
          </div>
      </CardContent>
    </Card>
    </Link>
  );
}

// Helper function to get language colors (simplified version)
function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: "#f1e05a",
    TypeScript: "#2b7489",
    Python: "#3572A5",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#239120",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Go: "#00ADD8",
    Rust: "#dea584",
    Swift: "#ffac45",
    Kotlin: "#F18E33",
    Dart: "#00B4AB",
    HTML: "#e34c26",
    CSS: "#1572B6",
    Shell: "#89e051",
    Vue: "#2c3e50",
    React: "#61dafb",
  };
  
  return colors[language] || "#8da0cb";
}