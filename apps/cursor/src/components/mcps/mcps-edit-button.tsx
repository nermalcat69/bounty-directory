"use client";

import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "../ui/button";

export function MCPsEditButton({
  ownerId,
  slug,
}: { ownerId: string; slug: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  if (ownerId !== userId) {
    return null;
  }

  return (
    <Link href={`/mcp/${slug}/edit`}>
      <Button size="sm" className="w-fit rounded-full font-mono text-xs">
        Edit
      </Button>
    </Link>
  );
}
