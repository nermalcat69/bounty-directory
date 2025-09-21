import { FreelanceForm } from "@/components/forms/freelance";
import { GithubSigninWrapper } from "@/components/github-signin-wrapper";
import { getSession } from "@/lib/auth-server";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Post a freelance project | Bounty Directory",
  description:
    "Post a freelance project on Bounty Directory for just $19 and connect with skilled developers.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 w-full max-w-sm mx-auto">
        <div className="max-w-md w-full text-center -mt-32">
          <p className="text-md mt-4">
            Sign in to post a freelance project <br />
            and connect with skilled developers for just $19.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <Suspense fallback={<div>Loading...</div>}>
                <GithubSigninWrapper redirectTo="/freelance/new" />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-sm xl:max-w-screen-sm border-t border-border pt-32 pb-16">
      <h1 className="text-2xl mb-4">Post a freelance project</h1>
      <p className="text-sm text-[#878787] mb-6">
        Connect with skilled developers and get your project done for just $19.
      </p>
      <FreelanceForm />
    </div>
  );
}