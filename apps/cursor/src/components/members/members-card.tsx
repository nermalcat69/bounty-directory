"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { extractGitHubUsername, getGitHubProfileUrl } from "@/lib/github-utils";

export function MembersCard({
  member,
  gray = false,
  noBorder = false,
}: {
  member: {
    slug: string;
    image: string;
    name: string;
    website?: string | null;
    socialXLink?: string | null;
  };
  gray?: boolean;
  noBorder?: boolean;
}) {
  // Check if slug is in the format "username-id" (GitHub username with ID suffix)
  const githubSlugMatch = member.slug && member.slug.match(/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)-\d+$/);
  
  // Extract GitHub username from slug format or use other fields
  const githubUsername = githubSlugMatch 
    ? githubSlugMatch[1] // Extract username part before the ID
    : extractGitHubUsername(member);
  
  // Always link to GitHub profile if username is available, otherwise don't link
  const profileUrl = githubUsername ? getGitHubProfileUrl(githubUsername) : null;

  if (!profileUrl) {
    // If no GitHub profile found, render as non-clickable card
    return (
      <div
        className={cn(
          "flex border border-border p-2 items-center gap-2",
          noBorder && "border-none",
        )}
      >
        <Avatar className="rounded-none">
          <AvatarImage
            src={member.image}
            alt={member.name}
            className={cn(
              "rounded-none",
              gray
                ? "grayscale transition-all duration-300"
                : "",
            )}
          />
          <AvatarFallback className="rounded-none">
            {member.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="text-xs text-[#878787] font-mono font-medium">
          {member.name}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex border border-border p-2 items-center gap-2 group",
        noBorder && "border-none",
      )}
    >
      <Avatar className="rounded-none">
        <AvatarImage
          src={member.image}
          alt={member.name}
          className={cn(
            "rounded-none",
            gray
              ? "grayscale group-hover:grayscale-0 transition-all duration-300"
              : "",
          )}
        />
        <AvatarFallback className="rounded-none">
          {member.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="text-xs text-[#878787] font-mono font-medium">
        {member.name}
      </div>
    </Link>
  );
}
