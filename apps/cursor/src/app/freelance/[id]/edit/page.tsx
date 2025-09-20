import { EditFreelanceForm } from "@/components/forms/edit-freelance";
import { GithubSigninWrapper } from "@/components/github-signin-wrapper";
import { getFreelanceById } from "@/data/drizzle-queries";
import { getSession } from "@/lib/auth-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "Edit freelance project | Cursor Directory",
  description:
    "Edit a freelance project on Cursor Directory and connect with skilled developers.",
};

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getSession();
  const freelance = await getFreelanceById(id);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 w-full max-w-sm mx-auto">
        <div className="max-w-md w-full text-center -mt-32">
          <p className="text-md mt-4">
            Sign in to edit a freelance project <br />
            and connect with skilled developers.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <GithubSigninWrapper redirectTo={`/freelance/${id}/edit`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (freelance?.ownerId !== session.user.id) {
    redirect("/freelance");
  }

  return (
    <div className="mx-auto max-w-screen-sm xl:max-w-screen-sm border-t border-border pt-32 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl mb-4">Edit freelance project</h1>
      </div>

      <EditFreelanceForm data={{
        id: freelance.id,
        title: freelance.title || undefined,
        description: freelance.description || undefined,
        projectType: freelance.projectType || undefined,
        budgetRange: freelance.budgetRange || undefined,
        urgency: freelance.urgency || undefined,
        contactEmail: freelance.contactEmail || undefined,
        workplace: freelance.workplace || undefined,
        company_id: freelance.companyId,
        active: freelance.active ?? true
      }} />
    </div>
  );
}