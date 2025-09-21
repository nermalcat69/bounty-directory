import { EditJobForm } from "@/components/forms/edit-job";
import { GithubSigninWrapper } from "@/components/github-signin-wrapper";
import { JobListingSwitch } from "@/components/jobs/jobs-listing-switch";
import { getJobById } from "@/data/queries";
import { getSession } from "@/lib/auth-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Edit job listing | Bounty Directory",
  description:
    "Edit a job listing on Bounty Directory and reach 300k+ developers today.",
};

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getSession();
  const { data: job } = await getJobById(id);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 w-full max-w-sm mx-auto">
        <div className="max-w-md w-full text-center -mt-32">
          <p className="text-md mt-4">
            Sign in to edit a job listing <br />
            and reach 300k+ developers today.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <GithubSigninWrapper redirectTo={`/jobs/${id}/edit`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (job?.company?.ownerId !== session.user.id) {
    redirect("/jobs");
  }

  return (
    <div className="mx-auto max-w-screen-sm xl:max-w-screen-sm border-t border-border pt-32 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl mb-4">Edit job listing </h1>
        <JobListingSwitch id={job.id} active={job.active ?? true} />
      </div>

      <EditJobForm data={{
        id: job.id,
        title: job.title,
        location: job.location || undefined,
        description: job.description,
        link: job.link,
        workplace: job.workplace,
        experience: job.experience || undefined,
        company_id: job.companyId,
        active: job.active ?? true
      }} />
    </div>
  );
}
