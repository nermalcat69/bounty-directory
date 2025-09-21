"use server";

import { db } from "@/db";
import { freelance } from "@/db/schema";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const createFreelanceListingAction = authActionClient
  .metadata({
    actionName: "create-freelance-listing",
  })
  .schema(
    z.object({
      title: z.string(),
      company_id: z.string(),
      description: z.string(),
      workplace: z.enum(["On site", "Remote", "Hybrid"]),
      projectType: z.enum([
        "Web Development",
        "Mobile App", 
        "Desktop App",
        "API Development",
        "Database Design",
        "UI/UX Design",
        "DevOps",
        "Data Analysis",
        "Machine Learning",
        "Other"
      ]),
      budgetRange: z.enum([
        "Under $500",
        "$500-$1000", 
        "$1000-$2500",
        "$2500-$5000",
        "$5000-$10000",
        "$10000+"
      ]),
      duration: z.string().nullable(),
      skills: z.string().nullable(),
      urgency: z.enum(["Low", "Medium", "High", "Urgent"]),
      contactEmail: z.string().email(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        title,
        company_id,
        description,
        workplace,
        projectType,
        budgetRange,
        duration,
        skills,
        urgency,
        contactEmail,
      },
      ctx: { userId },
    }) => {
      const result = await db
        .insert(freelance)
        .values({
          title,
          companyId: company_id,
          description,
          workplace,
          projectType,
          budgetRange,
          duration: duration || null,
          skills: skills || null,
          urgency,
          contactEmail,
          plan: "standard", // Fixed $19 pricing
          ownerId: userId,
        })
        .returning({ id: freelance.id });

      const freelanceId = result[0].id;

      // For now, redirect to the freelance page - later we can add payment processing
      redirect(`/freelance`);
    },
  );