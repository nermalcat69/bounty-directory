import { JobsFeatured } from "@/components/jobs/jobs-featured";
import { JobsList } from "@/components/jobs/jobs-list";
import { getFeaturedJobs } from "@/data/queries";
import Link from "next/link";

export const metadata = {
  title: "Jobs | Bounty Directory",
  description: "Find your next job with Bounty Directory",
};

export const revalidate = 3600;

export default async function Page() {
  const { data: featuredJobs } = await getFeaturedJobs();

  // Transform the data to match the Job type expected by JobsFeatured
  const transformedFeaturedJobs = featuredJobs?.map(job => ({
    id: job.id,
    title: job.title,
    description: job.description,
    company: {
      name: job.company.name,
      slug: job.company.slug,
      image: job.company.image || "",
    },
    workplace: job.workplace,
    link: job.link,
  })) || null;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12 md:mt-24 pb-32">
      <h1 className="text-xl mb-2">Featured Jobs</h1>
      <p className="text-sm text-[#878787] mb-8">
        Browse positions or post a job to reach thousands of active developers
        .
      </p>

      <JobsFeatured data={transformedFeaturedJobs} />
      <JobsList />
    </div>
  );
}
