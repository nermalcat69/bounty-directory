import {
  activateSubscription,
} from "@/lib/polar";
import { Webhooks } from "@polar-sh/nextjs";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    switch (payload.type) {
      // Checkout has been updated - this will be triggered when checkout status goes from confirmed -> succeeded
      case "checkout.updated": {
        // Handle subscription checkout
        if (payload.data.metadata.userId && payload.data.metadata.plan === "alerts_monthly") {
          await activateSubscription(
            payload.data.metadata.userId as string,
            payload.data.id as string,
            payload.data.customerId as string,
          );
          break;
        }

        console.error("Unknown checkout type or missing metadata");
        break;
      }



      default:
        console.log("Unknown event", payload.type);
        break;
    }
  },
});
