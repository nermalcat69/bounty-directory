import { FreelanceCard } from "./freelance-card";
import { getFreelance } from "@/data/drizzle-queries";

interface FreelanceFeaturedServerProps {
  hidePagination?: boolean;
  limit?: number;
}

export async function FreelanceFeaturedServer({ 
  hidePagination = false, 
  limit = 6 
}: FreelanceFeaturedServerProps) {
  try {
    // Fetch freelance jobs from database
    const freelanceJobs = await getFreelance();

    if (freelanceJobs.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No freelance opportunities available at the moment.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {freelanceJobs.slice(0, limit).map((freelance) => (
          <FreelanceCard 
            key={freelance.id} 
            data={{
              id: freelance.id,
              title: freelance.title,
              description: freelance.description,
              created_at: freelance.createdAt?.toISOString() || "",
              owner_id: freelance.ownerId || "",
              company: {
                name: freelance.company.name,
                image: freelance.company.image || "",
                slug: freelance.company.slug,
              },
              projectType: freelance.projectType || "",
              budgetRange: freelance.budgetRange || "",
              duration: freelance.duration || "",
              skills: freelance.skills || "",
              urgency: freelance.urgency || "",
              contactEmail: freelance.contactEmail || "",
              workplace: freelance.workplace || "Remote"
            }} 
          />
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error fetching featured freelance jobs:", error);
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load freelance opportunities. Please try again later.</p>
      </div>
    );
  }
}