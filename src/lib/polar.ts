import { Polar } from "@polar-sh/sdk";
import { revalidatePath } from "next/cache";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT as "production" | "sandbox",
});

export const PRODUCTS_PRODUCTION = {
  subscriptions: {
    alerts_monthly: {
      id: process.env.POLAR_SUBSCRIPTION_ALERTS_ID || "REPLACE_WITH_ACTUAL_PRODUCT_ID",
      name: "Alert Subscription",
      price: 3,
    },
  },
};

export const PRODUCTS_SANDBOX = {
  subscriptions: {
    alerts_monthly: {
      id: "REPLACE_WITH_ACTUAL_SANDBOX_PRODUCT_ID", // TODO: Replace with actual Polar sandbox product ID from dashboard
      name: "Alert Subscription",
      price: 3,
    },
  },
};



// Subscription-related functions
export function getSubscriptionProduct() {
  if (process.env.POLAR_ENVIRONMENT === "production") {
    return PRODUCTS_PRODUCTION.subscriptions.alerts_monthly;
  }
  return PRODUCTS_SANDBOX.subscriptions.alerts_monthly;
}

export async function createSubscriptionCheckoutSession({
  userId,
  email,
  customerName,
}: {
  userId: string;
  email: string;
  customerName: string;
}) {
  const product = getSubscriptionProduct();

  const session = await polar.checkouts.create({
    productId: product.id,
    customerExternalId: userId,
    customerEmail: email,
    customerName,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/alerts?success=true`,
    metadata: {
      userId,
      plan: "alerts_monthly",
    },
  });

  return session;
}

export async function activateSubscription(
  userId: string,
  polarSubscriptionId: string,
  polarCustomerId: string,
) {
  const { db } = await import("@/db");
  const { subscriptions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  // Check if subscription already exists
  const existingSubscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, userId))
    .limit(1);

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  if (existingSubscription.length > 0) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        status: "active",
        polar_subscription_id: polarSubscriptionId,
        polar_customer_id: polarCustomerId,
        current_period_start: now,
        current_period_end: nextMonth,
        updated_at: now,
      })
      .where(eq(subscriptions.user_id, userId));
  } else {
    // Create new subscription
    await db.insert(subscriptions).values({
      user_id: userId,
      plan_type: "alerts_monthly",
      status: "active",
      polar_subscription_id: polarSubscriptionId,
      polar_customer_id: polarCustomerId,
      current_period_start: now,
      current_period_end: nextMonth,
    });
  }

  revalidatePath("/alerts");
}
