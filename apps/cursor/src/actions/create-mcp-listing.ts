"use server";

import { db } from "@/db";
import { mcps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMCPListingCheckoutSession } from "@/lib/polar";
import { createPostRatelimit } from "@/lib/ratelimit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const createMCPListingAction = authActionClient
  .metadata({
    actionName: "create-mcp-listing",
  })
  .schema(
    z.object({
      name: z.string(),
      company_id: z.string().nullable(),
      logo: z.string().nullable(),
      description: z.string(),
      mcp_link: z.string().nullable().optional(),
      link: z.string().url(),
      plan: z.enum(["standard", "featured", "premium"]),
    }),
  )
  .action(
    async ({
      parsedInput: {
        name,
        company_id,
        logo,
        description,
        link,
        plan,
        mcp_link,
      },
      ctx: { userId, email, name: customerName },
    }) => {
      const { success } = await createPostRatelimit.limit(
        `create-mcp-listing-${userId}`,
      );

      if (!success) {
        throw new Error("Too many requests. Please try again later.");
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [newMcp] = await db
        .insert(mcps)
        .values({
          name,
          slug,
          companyId: company_id === "" ? null : company_id,
          description,
          npmPackage: mcp_link === "" ? null : mcp_link,
          repository: link,
          plan,
          active: plan === "standard",
        })
        .returning({ id: mcps.id, slug: mcps.slug });

      revalidatePath("/mcp");

      if (plan === "standard" && newMcp.slug) {
        redirect(`/mcp/${newMcp.slug}`);
      }

      const session = await createMCPListingCheckoutSession({
        plan,
        mcpListingId: newMcp.id,
        companyId: company_id ?? "",
        email: email ?? "",
        customerName: customerName ?? "",
      });

      redirect(session.url);
    },
  );
