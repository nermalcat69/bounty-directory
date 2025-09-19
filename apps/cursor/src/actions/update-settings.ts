"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

// Follow functionality removed - update-settings action no longer needed
export const updateSettingsAction = authActionClient
  .metadata({
    actionName: "update-settings",
  })
  .schema(
    z.object({
      // No settings to update since follow functionality is removed
    }),
  )
  .action(async ({ ctx: { userId } }) => {
    // Return user info without any updates
    const [user] = await db
      .select({ id: users.id, slug: users.slug })
      .from(users)
      .where(eq(users.id, userId));

    return user;
  });
