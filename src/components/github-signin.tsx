"use client";

import { signIn } from "@/lib/auth-client";
import { GithubIcon, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

export function GithubSignin({ redirectTo }: { redirectTo?: string }) {
  const searchParams = useSearchParams();
  const [next, setNext] = useState(redirectTo ?? "/");
  const [isLoading, setIsLoading] = useState(false);

  // Handle search params on client side to avoid hydration mismatch
  useEffect(() => {
    const nextParam = searchParams.get("next");
    if (nextParam) {
      setNext(nextParam);
    }
  }, [searchParams]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: "github",
        callbackURL: next,
      });
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="bg-white text-black h-8 rounded-full"
      onClick={handleSignIn}
      disabled={isLoading}
    >
      <span className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GithubIcon className="w-4 h-4" />
        )}
        {isLoading ? "Signing in..." : "Sign with GitHub"}
      </span>
    </Button>
  );
}
