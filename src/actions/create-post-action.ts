"use server";

import { createPostRatelimit } from "@/lib/ratelimit";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const createPostAction = authActionClient
  .metadata({
    actionName: "create-post",
  })
  .schema(
    z.object({
      title: z.string(),
      content: z.string().optional().nullable(),
      url: z.string().url().nullable(),
    }),
  )
  .action(async ({ parsedInput: { title, content, url }, ctx: { userId } }) => {
    const { success } = await createPostRatelimit.limit(
      `create-post-${userId}`,
    );

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    // Check if URL already exists
    if (url) {
      const existingPost = await db
        .select()
        .from(posts)
        .where(eq(posts.url, url))
        .limit(1);

      if (existingPost.length > 0) {
        throw new Error("This URL has already been submitted.");
      }
    }

    const result = await db
      .insert(posts)
      .values({
        title,
        content: content || null,
        url: url || null,
        userId,
      })
      .returning();

    revalidatePath("/board");

    return result[0];
  });
