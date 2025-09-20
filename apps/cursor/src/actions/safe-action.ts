import { auth, syncUserToMainTable } from "@/lib/auth";
import {
  DEFAULT_SERVER_ERROR_MESSAGE,
  createSafeActionClient,
} from "next-safe-action";
import { headers } from "next/headers";
import { z } from "zod";

class ActionError extends Error {}

// Base client.
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e.message);

    if (e instanceof ActionError) {
      return e.message;
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
  defineMetadataSchema() {
    return z.object({
      actionName: z.string(),
    });
  },
  // Define logging middleware.
}).use(async ({ next, clientInput, metadata }) => {
  const result = await next();

  console.log("Result ->", result);
  console.log("Client input ->", clientInput);
  console.log("Metadata ->", metadata);

  return result;
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Session not found!");
  }

  // Sync auth user to main users table and get the main user UUID
  const mainUserId = await syncUserToMainTable(session.user.id);
  
  if (!mainUserId) {
    throw new Error("Failed to sync user to main table!");
  }

  return next({
    ctx: {
      userId: mainUserId, // Use the main user UUID instead of auth user text ID
      email: session.user.email,
      name: session.user.name,
    },
  });
});
