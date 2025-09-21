"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const upsertCompanyAction = authActionClient
  .metadata({
    actionName: "upsert-company",
  })
  .schema(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      image: z.string().url().nullable(),
      slug: z.string().optional(),
      location: z.string().nullable(),
      bio: z.string().nullable(),
      website: z.string().nullable(),
      social_x_link: z.string().nullable(),
      is_public: z.boolean(),
      redirect: z.boolean().optional(),
    }),
  )
  .action(
    async ({
      parsedInput: {
        id,
        name,
        image,
        slug,
        location,
        bio,
        website,
        social_x_link,
        is_public,
        redirect: shouldRedirect,
      },
    }) => {
      let result;

      if (id) {
        // Update existing company
        const updateData: any = {
          name,
          description: bio,
          website,
        };
        if (image) updateData.image = image;
        if (slug) updateData.slug = slug;

        result = await db
          .update(companies)
          .set(updateData)
          .where(eq(companies.id, id))
          .returning({ id: companies.id, slug: companies.slug });
      } else {
        // Insert new company
        const insertData: any = {
          name,
          description: bio,
          website,
        };
        if (image) insertData.image = image;
        if (slug) insertData.slug = slug;

        result = await db
          .insert(companies)
          .values(insertData)
          .returning({ id: companies.id, slug: companies.slug });
      }

      const data = result[0];

      if (shouldRedirect) {
        redirect(`/c/${data?.slug}`);
      }

      return data;
    },
  );
