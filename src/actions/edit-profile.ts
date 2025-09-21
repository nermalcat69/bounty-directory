"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const editProfileAction = authActionClient
  .metadata({
    actionName: "edit-profile",
  })
  .schema(
    z.object({
      name: z.string(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        name,
      },
      ctx: { userId },
    }) => {
      const updatedUser = await db
        .update(users)
        .set({
          name,
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      redirect("/");

      return updatedUser;
    },
  );
