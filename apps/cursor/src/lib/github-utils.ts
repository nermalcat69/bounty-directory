/**
 * Utility functions for extracting GitHub information from user data
 */

/**
 * Extracts GitHub username from various user data fields
 * @param user - User object with potential GitHub information
 * @returns GitHub username or null if not found
 */
export function extractGitHubUsername(user: {
  website?: string | null;
  image?: string | null;
  socialXLink?: string | null;
}): string | null {
  // Check website URL for GitHub profile
  if (user.website) {
    const githubMatch = user.website.match(/github\.com\/([^\/\?#]+)/i);
    if (githubMatch && githubMatch[1]) {
      return githubMatch[1];
    }
  }

  // Check image URL for GitHub avatar
  if (user.image) {
    const avatarMatch = user.image.match(/avatars\.githubusercontent\.com\/u\/\d+/i);
    if (avatarMatch) {
      // For GitHub avatars, we need to extract from the URL pattern
      // This is less reliable, so we'll try to get from website first
      const githubAvatarMatch = user.image.match(/github\.com\/([^\/\?#\.]+)/i);
      if (githubAvatarMatch && githubAvatarMatch[1]) {
        return githubAvatarMatch[1];
      }
    }
  }

  return null;
}

/**
 * Generates GitHub profile URL from username
 * @param username - GitHub username
 * @returns Full GitHub profile URL
 */
export function getGitHubProfileUrl(username: string): string {
  return `https://github.com/${username}`;
}

/**
 * Checks if a URL is a GitHub profile URL
 * @param url - URL to check
 * @returns true if it's a GitHub profile URL
 */
export function isGitHubProfileUrl(url: string): boolean {
  return /^https?:\/\/github\.com\/[^\/\?#]+\/?$/i.test(url);
}