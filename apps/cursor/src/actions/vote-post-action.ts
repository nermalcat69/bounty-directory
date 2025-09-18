"use server";

import { db } from "@/db";
import { votes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const votePostAction = authActionClient
  .metadata({
    actionName: "vote-post",
  })
  .schema(
    z.object({
      postId: z.string(),
      action: z.enum(["upvote", "downvote"]),
    }),
  )
  .action(async ({ parsedInput: { postId, action }, ctx: { userId } }) => {
    if (action === "upvote") {
      await db
        .insert(votes)
        .values({ postId: postId, userId: userId });

      revalidatePath("/board");

      return;
    }

    await db
      .delete(votes)
      .where(and(eq(votes.postId, postId), eq(votes.userId, userId)));

    revalidatePath("/board");

    return;
  });
