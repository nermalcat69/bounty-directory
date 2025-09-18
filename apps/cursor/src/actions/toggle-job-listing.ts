"use server";

import { db } from "@/db";
import { jobs, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const toggleJobListingAction = authActionClient
  .metadata({
    actionName: "toggle-job-listing",
  })
  .schema(
    z.object({
      id: z.string(),
      active: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { id, active }, ctx: { userId } }) => {
    // First, get the job with its company to verify ownership
    const jobData = await db
      .select({
        id: jobs.id,
        companyId: jobs.companyId,
        companySlug: companies.slug,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(eq(jobs.id, id), eq(companies.ownerId, userId)))
      .limit(1);

    if (!jobData.length) {
      throw new Error("Job not found or you don't have permission to modify it");
    }

    // Update the job
    await db
      .update(jobs)
      .set({ active })
      .where(eq(jobs.id, id));

    revalidatePath(`/jobs/${jobData[0].companySlug}`);
    revalidatePath("/jobs");
    revalidatePath("/");

    return { slug: jobData[0].companySlug };
  });
