import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ExternalLink, Star, GitBranch } from "lucide-react";
import type { BountyIssue } from "@/app/api/bounties/route";

export function BountyCard({ bounty, isPage }: { bounty: BountyIssue; isPage?: boolean }) {
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

  return (
    <Card
      className={cn(
        "bg-background p-4 flex flex-col aspect-square max-h-[calc(100vh-8rem)]",
      )}
    >
      <CardContent
        className={cn(
          "bg-card h-full mb-2 p-4 text-sm opacity-50 hover:opacity-100 transition-opacity group relative flex-grow flex flex-col",
          isPage && "opacity-100",
        )}
      >
        <div className="group-hover:flex hidden right-4 top-4 absolute z-10">
          <Link href={bounty.html_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Link>
        </div>

        <div className="flex-grow flex flex-col space-y-3">
          {/* Header with repository info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <GitBranch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {bounty.repository.full_name}
              </span>
            </div>
            {bounty.repository.stargazers_count > 0 && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3" />
                <span>{bounty.repository.stargazers_count}</span>
              </div>
            )}
          </div>

          {/* Bounty amount */}
          {bounty.bounty_amount && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="bg-green-100 text-green-800 font-semibold">
                {bounty.bounty_amount}
              </Badge>
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {truncateText(bounty.title, 80)}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground flex-grow overflow-hidden">
            {truncateText(bounty.body || "No description available", 120)}
          </p>

          {/* Labels */}
          <div className="flex flex-wrap gap-1">
            {bounty.labels.slice(0, 3).map((label) => (
              <Badge
                key={label.name}
                variant="outline"
                className="text-xs px-1 py-0"
                style={{
                  borderColor: `#${label.color}`,
                  color: `#${label.color}`,
                }}
              >
                {label.name}
              </Badge>
            ))}
            {bounty.labels.length > 3 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{bounty.labels.length - 3}
              </Badge>
            )}
          </div>

          {/* Language */}
          {bounty.repository.language && (
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: getLanguageColor(bounty.repository.language)
                }}
              />
              <span className="text-xs text-muted-foreground">{bounty.repository.language}</span>
            </div>
          )}

          {/* Footer with author and date */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center space-x-2">
              <Avatar className="w-5 h-5">
                <img src={bounty.user.avatar_url} alt={bounty.user.login} />
              </Avatar>
              <span className="text-xs text-muted-foreground">{bounty.user.login}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(bounty.updated_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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