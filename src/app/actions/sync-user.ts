"use server";

import { auth } from "@/lib/auth";
import { syncUserToMainTable } from "@/lib/auth";
import { headers } from "next/headers";

export async function syncCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "No user session found" };
    }

    const result = await syncUserToMainTable(session.user.id);
    
    if (result) {
      return { success: true, userId: result };
    } else {
      return { success: false, error: "Failed to sync user" };
    }
  } catch (error) {
    console.error("Error in syncCurrentUser:", error);
    return { success: false, error: "Internal server error" };
  }
}