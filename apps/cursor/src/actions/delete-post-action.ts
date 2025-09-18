import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const deletePostAction = authActionClient
  .metadata({
    actionName: "delete-post",
  })
  .schema(
    z.object({
      postId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { postId }, ctx: { userId } }) => {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning();

    revalidatePath("/board");

    return result;
  });
