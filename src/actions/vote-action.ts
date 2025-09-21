"use server";

import { redisCache } from "@/lib/redis-cache";
import { headers } from "next/headers";
import { z } from "zod";
import { actionClient } from "./safe-action";

export const voteAction = actionClient
  .schema(
    z.object({
      slug: z.string(),
    }),
  )
  .action(async ({ parsedInput: { slug } }) => {
    const clientIP = await headers().then((headers) =>
      headers.get("x-forwarded-for"),
    );

    const hasVoted = await redisCache.sadd(`rules:${slug}:ip:${clientIP}`, "voted");

    if (hasVoted === 0) {
      return { success: false, message: "You have already voted for this rule" };
    }

    await redisCache.incr(`rules:${slug}`);
  });
