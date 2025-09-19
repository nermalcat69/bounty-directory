"use server";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authActionClient } from "./safe-action";

export const getUserCompaniesAction = authActionClient
  .metadata({
    actionName: "get-user-companies",
  })
  .action(async ({ ctx: { userId } }) => {
    const userCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.ownerId, userId));

    return userCompanies;
  });