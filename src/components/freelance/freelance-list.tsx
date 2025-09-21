import { getFreelance } from "@/data/drizzle-queries";
import { FreelanceBuy } from "./freelance-buy";
import { FreelanceCard } from "./freelance-card";

export async function FreelanceList() {
  const freelanceProjects = await getFreelance();

  return (
    <div className="flex gap-8 justify-between mt-6">
      <div className="flex flex-col gap-8 mt-10 max-w-screen-sm xl:max-w-screen-md border-t border-border pt-10">
        {freelanceProjects?.map((project: any) => (
          <FreelanceCard 
            key={project.id} 
            data={{
              id: project.id,
              title: project.title,
              description: project.description,
              created_at: project.createdAt?.toISOString() || "",
              owner_id: project.ownerId || "",
              company: {
                name: project.company.name,
                image: project.company.image || "",
                slug: project.company.slug,
              },
              projectType: project.projectType || "",
              budgetRange: project.budgetRange || "",
              duration: project.duration || "",
              skills: project.skills || "",
              urgency: project.urgency || "",
              contactEmail: project.contactEmail || "",
              workplace: project.workplace || "Remote"
            }} 
          />
        ))}
      </div>

      <div className="hidden lg:block mt-9">
        <FreelanceBuy />
      </div>
    </div>
  );
}