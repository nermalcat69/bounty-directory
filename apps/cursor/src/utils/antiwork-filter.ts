import type { GitHubIssue } from "@/lib/github";

/**
 * Filters GitHub issues to only include those with labels starting with '$'
 * This is used for antiwork bounties since GitHub Search API doesn't support label prefix matching
 */
export function filterIssuesWithDollarLabels(issues: GitHubIssue[]): GitHubIssue[] {
  return issues.filter(issue => 
    issue.labels.some(label => label.name.startsWith("$"))
  );
}

/**
 * Checks if a single issue has any labels starting with '$'
 */
export function haseDollarLabel(issue: GitHubIssue): boolean {
  return issue.labels.some(label => label.name.startsWith("$"));
}

/**
 * Extracts all dollar labels from an issue
 */
export function getDollarLabels(issue: GitHubIssue): Array<{ name: string; color: string }> {
  return issue.labels.filter(label => label.name.startsWith("$"));
}

/**
 * Gets the bounty amount from dollar labels (e.g., "$1K" -> 1000)
 */
export function extractBountyAmountFromLabels(issue: GitHubIssue): number {
  const dollarLabels = getDollarLabels(issue);
  
  for (const label of dollarLabels) {
    const match = label.name.match(/\$(\d+(?:\.\d+)?)(k|K|m|M)?/);
    if (match) {
      const value = parseFloat(match[1]);
      const multiplier = match[2]?.toLowerCase();
      
      if (multiplier === 'k') {
        return value * 1000;
      } else if (multiplier === 'm') {
        return value * 1000000;
      } else {
        return value;
      }
    }
  }
  
  return 0;
}