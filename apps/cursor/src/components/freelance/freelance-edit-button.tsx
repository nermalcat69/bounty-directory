"use client";

import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "../ui/button";

export function FreelanceEditButton({
  ownerId,
  id,
}: { ownerId: string; id: string }) {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  if (ownerId !== session.user.id) {
    return null;
  }

  return (
    <Link href={`/freelance/${id}/edit`}>
      <Button size="sm" className="w-fit rounded-full font-mono text-xs">
        Edit
      </Button>
    </Link>
  );
}