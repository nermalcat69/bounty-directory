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
      slug: z.string().nullable(),
      status: z.string().nullable(),
      bio: z.string().nullable(),
      work: z.string().nullable(),
      website: z.string().nullable(),
      social_x_link: z.string().nullable(),
      is_public: z.boolean(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        name,
        slug,
        status,
        bio,
        work,
        website,
        social_x_link,
        is_public,
      },
      ctx: { userId },
    }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          name,
          status,
          slug: slug || null,
          bio,
          work,
          website,
          socialXLink: social_x_link,
          public: is_public,
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id, slug: users.slug });

      redirect("/");

      return updatedUser;
    },
  );
