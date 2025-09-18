"use server";

import FollowerEmail from "@/emails/templates/follower";
import { resend } from "@/lib/resend";
import { db } from "@/db";
import { followers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const toggleFollowAction = authActionClient
  .metadata({
    actionName: "toggle-follow",
  })
  .schema(
    z.object({
      action: z.enum(["follow", "unfollow"]),
      userId: z.string().uuid(),
      slug: z.string(),
    }),
  )
  .action(
    async ({
      parsedInput: { userId, action, slug },
      ctx: { userId: currentUserId },
    }) => {
      if (action === "follow") {
        await db
          .insert(followers)
          .values({ followerId: currentUserId, followingId: userId });

        revalidatePath(`/u/${slug}`);

        // Get follower and following user data for email
        const followerData = await db
          .select({ name: users.name, slug: users.slug, email: users.email })
          .from(users)
          .where(eq(users.id, currentUserId))
          .limit(1);

        const followingData = await db
          .select({ email: users.email, name: users.name, followEmail: users.followEmail })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (followerData[0] && followingData[0] && followingData[0].followEmail) {
          waitUntil(
            resend.emails.send({
              from: "Cursor Directory <hello@transactional.bounty.directory>",
              to: followingData[0].email!,
              subject: `${followerData[0].name} is now following you on Cursor Directory`,
              react: FollowerEmail({
                 name: followingData[0].name!,
                 followerName: followerData[0].name!,
                 followerSlug: followerData[0].slug!,
                 followingSlug: slug,
               }),
            }),
          );
        }

        return;
      }

      if (action === "unfollow") {
        await db
          .delete(followers)
          .where(and(eq(followers.followerId, currentUserId), eq(followers.followingId, userId)));
      }

      revalidatePath(`/u/${slug}`);

      return;
    },
  );
