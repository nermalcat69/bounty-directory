"use server";

import { createJobListingCheckoutSession } from "@/lib/polar";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const createJobListingAction = authActionClient
  .metadata({
    actionName: "create-job-listing",
  })
  .schema(
    z.object({
      title: z.string(),
      company_id: z.string(),
      location: z.string().nullable(),
      description: z.string(),
      link: z.string().url(),
      workplace: z.enum(["On site", "Remote", "Hybrid"]),
      plan: z.enum(["standard", "featured", "premium"]),
      experience: z.string().nullable(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        title,
        company_id,
        location,
        description,
        link,
        workplace,
        experience,
        plan,
      },
      ctx: { email, name },
    }) => {
      const result = await db
        .insert(jobs)
        .values({
          title,
          companyId: company_id,
          location: location || null,
          description,
          link,
          workplace,
          experience: experience || null,
          plan,
        })
        .returning({ id: jobs.id });

      const jobId = result[0].id;

      const session = await createJobListingCheckoutSession({
        plan,
        jobListingId: jobId,
        companyId: company_id,
        email: email ?? "",
        customerName: name ?? "",
      });

      redirect(session.url);
    },
  );
