"use server";

import { updateFreelance } from "@/data/drizzle-actions";
import { authActionClient } from "./safe-action";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
  company_id: z.string(),
  title: z.string(),
  description: z.string(),
  projectType: z.string(),
  budgetRange: z.string(),
  urgency: z.string(),
  contactEmail: z.string(),
  workplace: z.string(),
});

export const updateFreelanceListingAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput: input, ctx: { userId } }) => {
    await updateFreelance(input.id, {
      title: input.title,
      description: input.description,
      projectType: input.projectType as any,
      budgetRange: input.budgetRange as any,
      urgency: input.urgency as any,
      contactEmail: input.contactEmail,
      workplace: input.workplace as any,
    });

    redirect("/freelance");
  });