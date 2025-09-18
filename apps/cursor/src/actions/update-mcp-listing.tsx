"use server";

import { db } from "@/db";
import { mcps, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const updateMCPListingAction = authActionClient
  .metadata({
    actionName: "update-mcp-listing",
  })
  .schema(
    z.object({
      id: z.string(),
      name: z.string(),
      company_id: z.string().optional(),
      description: z.string(),
      config: z.record(z.string(), z.any()).nullable(),
      link: z.string().url(),
      logo: z.string().optional(),
    }),
  )
  .action(
    async ({
      parsedInput: { id, name, company_id, description, link, logo, config },
      ctx: { userId },
    }) => {
      // First verify ownership through company
      const mcpData = await db
        .select({
          id: mcps.id,
          companyId: mcps.companyId,
        })
        .from(mcps)
        .leftJoin(companies, eq(mcps.companyId, companies.id))
        .where(
          and(
            eq(mcps.id, id),
            eq(companies.ownerId, userId)
          )
        )
        .limit(1);

      if (!mcpData.length) {
        throw new Error("MCP not found or you don't have permission to modify it");
      }

      // Generate slug from name if name changed
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [updatedMcp] = await db
        .update(mcps)
        .set({
          name,
          slug,
          description,
          companyId: company_id || null,
          repository: link,
        })
        .where(eq(mcps.id, id))
        .returning({ id: mcps.id });

      revalidatePath("/mcps");
      revalidatePath("/");

      return updatedMcp;
    },
  );
