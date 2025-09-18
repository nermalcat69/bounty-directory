"use client";

import { signIn } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

export function GoogleSignin({ redirectTo }: { redirectTo?: string }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? redirectTo ?? "/";

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: next,
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  return (
    <Button
      variant="outline"
      className="border border-border rounded-full"
      onClick={handleGoogleSignIn}
    >
      <span className="flex items-center gap-2">
        {/* <GoogleIcon className="w-4 h-4" /> */}
        Sign in with Google
      </span>
    </Button>
  );
}
