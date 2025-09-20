import { FreelanceFeatured } from "@/components/freelance/freelance-featured";
import { FreelanceList } from "@/components/freelance/freelance-list";
import { getFeaturedFreelance } from "@/data/drizzle-queries";
import Link from "next/link";

export const metadata = {
  title: "Freelance Projects | Cursor Directory",
  description: "Find your next freelance project with Cursor Directory",
};

export const revalidate = 3600;

export default async function Page() {
  const featuredFreelance = await getFeaturedFreelance();

  // Transform the data to match the Freelance type expected by FreelanceFeatured
  const transformedFeaturedFreelance = featuredFreelance?.map(project => ({
    id: project.id,
    title: project.title,
    description: project.description,
    company: {
      name: project.company.name,
      slug: project.company.slug,
      image: project.company.image || "",
    },
    workplace: "Remote", // Default since not in featured query
    projectType: project.projectType || "Other",
    budgetRange: project.budgetRange || "Under $500",
    urgency: project.urgency || "Medium",
    contactEmail: project.contactEmail || "",
  })) || null;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12 md:mt-24 pb-32">
      <h1 className="text-xl mb-2">Featured Freelance Projects</h1>
      <p className="text-sm text-[#878787] mb-8">
        Browse projects or{" "}
        <Link href="/freelance/new" className="border-b border-border border-dashed">
          post a freelance project for just $19 to reach skilled developers
        </Link>
        .
      </p>

      <FreelanceFeatured data={transformedFeaturedFreelance} />
      <FreelanceList />
    </div>
  );
}