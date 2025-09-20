"use client";

import { Suspense } from "react";
import { GithubSignin } from "./github-signin";

function GithubSigninInner({ redirectTo }: { redirectTo?: string }) {
  return <GithubSignin redirectTo={redirectTo} />;
}

export function GithubSigninWrapper({ redirectTo }: { redirectTo?: string }) {
  return (
    <Suspense fallback={<div className="animate-pulse bg-card size-6 rounded-none" />}>
      <GithubSigninInner redirectTo={redirectTo} />
    </Suspense>
  );
}