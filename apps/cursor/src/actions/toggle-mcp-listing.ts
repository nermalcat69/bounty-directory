"use server";

import { db } from "@/db";
import { mcps, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const toggleMCPListingAction = authActionClient
  .metadata({
    actionName: "toggle-mcp-listing",
  })
  .schema(
    z.object({
      id: z.string(),
      active: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { id, active }, ctx: { userId } }) => {
    // First verify ownership through company
    const [updatedMcp] = await db
      .update(mcps)
      .set({ active })
      .from(mcps)
      .innerJoin(companies, eq(mcps.companyId, companies.id))
      .where(
        and(
          eq(mcps.id, id),
          eq(companies.ownerId, userId)
        )
      )
      .returning({ slug: mcps.slug });

    if (!updatedMcp) {
      throw new Error("MCP not found or you don't have permission to modify it");
    }

    revalidatePath(`/mcp/${updatedMcp.slug}`);
    revalidatePath("/mcp");
    revalidatePath("/");

    return updatedMcp;
  });
