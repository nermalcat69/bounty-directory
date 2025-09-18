"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const updateSettingsAction = authActionClient
  .metadata({
    actionName: "update-settings",
  })
  .schema(
    z.object({
      follow_email: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { follow_email }, ctx: { userId } }) => {
    const [updatedUser] = await db
      .update(users)
      .set({
        followEmail: follow_email,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id, slug: users.slug });

    revalidatePath(`/u/${updatedUser.slug}/settings`);

    return updatedUser;
  });
