import { Polar } from "@polar-sh/sdk";
import { revalidatePath } from "next/cache";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT as "production" | "sandbox",
});

export const PRODUCTS_PRODUCTION = {
  jobs: {
    standard: {
      id: process.env.POLAR_JOB_STANDARD_ID || "4ca0256a-62c8-4110-8aaf-b27e7d96b6cb",
      name: "Standard Job Listing",
      price: 99,
    },
    featured: {
      id: process.env.POLAR_JOB_FEATURED_ID || "4504bcd0-576c-423f-959c-9ce4ae1ae685",
      name: "Featured Job Listing",
      price: 299,
    },
    premium: {
      id: process.env.POLAR_JOB_PREMIUM_ID || "c39ab0dd-f9c4-4e0d-bd37-a722e490b1b8",
      name: "Premium Job Listing",
      price: 999,
    },
  },
  subscriptions: {
    alerts_monthly: {
      id: process.env.POLAR_SUBSCRIPTION_ALERTS_ID || "REPLACE_WITH_ACTUAL_PRODUCT_ID",
      name: "Alert Subscription",
      price: 3,
    },
  },
};

export const PRODUCTS_SANDBOX = {
  jobs: {
    standard: {
      id: "5534a87b-72cd-424e-bdeb-856970689a9a",
      name: "Standard Job Listing",
      price: 99,
    },
    featured: {
      id: "33c524d0-9177-44e8-87b5-2beaf0588ee6",
      name: "Featured Job Listing",
      price: 299,
    },
    premium: {
      id: "5de476d6-da90-41f7-9022-ec22ff7e1feb",
      name: "Premium Job Listing",
      price: 999,
    },
  },
  subscriptions: {
    alerts_monthly: {
      id: "REPLACE_WITH_ACTUAL_SANDBOX_PRODUCT_ID", // TODO: Replace with actual Polar sandbox product ID from dashboard
      name: "Alert Subscription",
      price: 3,
    },
  },
};

export function getJobListingProduct(plan: string) {
  if (process.env.POLAR_ENVIRONMENT === "production") {
    return PRODUCTS_PRODUCTION.jobs[
      plan as keyof typeof PRODUCTS_PRODUCTION.jobs
    ];
  }

  return PRODUCTS_SANDBOX.jobs[plan as keyof typeof PRODUCTS_SANDBOX.jobs];
}

export async function createJobListingCheckoutSession({
  plan,
  jobListingId,
  companyId,
  email,
  customerName,
}: {
  plan: string;
  jobListingId: string;
  companyId: string;
  email: string;
  customerName: string;
}) {
  const productId = getJobListingProduct(plan).id;

  const session = await polar.checkouts.create({
    productId,
    customerExternalId: companyId,
    customerEmail: email,
    customerName,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/jobs`,
    metadata: {
      jobListingId,
      plan,
    },
  });

  return session;
}

export function getJobListingOrderPlan(plan: string) {
  switch (plan) {
    case "featured":
      return 1;
    case "premium":
      return 2;
    default:
      return 0;
  }
}

export async function activateJobListing(
  jobListingId: string,
  productId: string,
) {
  const { db } = await import("@/db");
  const { jobs } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db
    .update(jobs)
    .set({ active: true, plan: productId as any })
    .where(eq(jobs.id, jobListingId));

  revalidatePath("/jobs");
}

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
