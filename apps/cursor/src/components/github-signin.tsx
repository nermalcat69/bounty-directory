"use client";

import { signIn } from "@/lib/auth-client";
import { GithubIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

export function GithubSignin({ redirectTo }: { redirectTo?: string }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? redirectTo ?? "/";

  return (
    <Button
      variant="outline"
      className="bg-white text-black h-8 rounded-full"
      onClick={() => {
        signIn.social({
          provider: "github",
          callbackURL: next,
        });
      }}
    >
      <span className="flex items-center gap-2">
        Sign with GitHub
      </span>
    </Button>
  );
}
