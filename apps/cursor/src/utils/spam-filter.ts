import type { GitHubIssue } from "@/lib/github";

/**
 * List of known spam/test usernames that should be filtered out from bounty fetching
 * These accounts create spammy issues with no actual bounty value
 */
const SPAM_USERNAMES = new Set([
  "19224421664",
  "192600", 
  "gerderanvogdsde5587",
  "kolotikwoan",
  "ylc8037",
  "18605041367"
]);

/**
 * Checks if a username is in the spam list
 */
export function isSpamUser(username: string): boolean {
  return SPAM_USERNAMES.has(username);
}

/**
 * Filters out GitHub issues created by spam users
 */
export function filterSpamUsers(issues: GitHubIssue[]): GitHubIssue[] {
  return issues.filter(issue => !isSpamUser(issue.user.login));
}

/**
 * Checks if a GitHub issue is created by a spam user
 */
export function isSpamIssue(issue: GitHubIssue): boolean {
  return isSpamUser(issue.user.login);
}

/**
 * Logs when a spam user's issue is filtered out
 */
export function logSpamUserFiltered(username: string, issueId: number): void {
  console.log(`Filtered spam user issue: ${username} (issue #${issueId})`);
}