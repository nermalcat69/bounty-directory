"use client";

import { Suspense, useState, useEffect } from "react";
import { GithubSignin } from "./github-signin";

function GithubSigninInner({ redirectTo }: { redirectTo?: string }) {
  return <GithubSignin redirectTo={redirectTo} />;
}

export function GithubSigninWrapper({ redirectTo }: { redirectTo?: string }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="size-6" suppressHydrationWarning />;
  }

  return (
    <Suspense fallback={<div className="animate-pulse bg-card size-6 rounded-none" suppressHydrationWarning />}>
      <GithubSigninInner redirectTo={redirectTo} />
    </Suspense>
  );
}