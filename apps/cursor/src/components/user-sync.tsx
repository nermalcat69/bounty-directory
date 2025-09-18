"use client";

import { useSession } from "@/lib/auth-client";
import { syncCurrentUser } from "@/app/actions/sync-user";
import { useEffect, useState } from "react";

export function UserSync() {
  const { data: session } = useSession();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    async function handleUserSync() {
      if (session?.user && !synced) {
        try {
          const result = await syncCurrentUser();
          if (result.success) {
            console.log("User synced successfully:", result.userId);
            setSynced(true);
          } else {
            console.error("Failed to sync user:", result.error);
          }
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      }
    }

    handleUserSync();
  }, [session?.user, synced]);

  return null; // This component doesn't render anything
}