"use server";

import { db } from "@/db";
import { jobs, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const updateJobListingAction = authActionClient
  .metadata({
    actionName: "update-job-listing",
  })
  .schema(
    z.object({
      id: z.string(),
      title: z.string(),
      company_id: z.string(),
      location: z.string().nullable(),
      description: z.string(),
      link: z.string().url(),
      workplace: z.enum(["On site", "Remote", "Hybrid"]),
      experience: z.string().nullable(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        id,
        title,
        company_id,
        location,
        description,
        link,
        workplace,
        experience,
      },
      ctx: { userId },
    }) => {
      // First verify ownership through company
      const [updatedJob] = await db
        .update(jobs)
        .set({
          title,
          companyId: company_id,
          location,
          description,
          link,
          workplace,
          experience,
        })
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .where(
          and(
            eq(jobs.id, id),
            eq(companies.ownerId, userId)
          )
        )
        .returning({ id: jobs.id });

      if (!updatedJob) {
        throw new Error("Job not found or you don't have permission to modify it");
      }

      revalidatePath("/jobs");
      revalidatePath("/");

      return updatedJob;
    },
  );
