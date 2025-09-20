import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface UserSubscription {
  id: string;
  plan_type: string;
  status: "active" | "canceled" | "past_due" | "incomplete" | "trialing";
  current_period_start: Date | null;
  current_period_end: Date | null;
  polar_subscription_id: string | null;
}

/**
 * Check if a user has an active subscription for alerts
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const subscription = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, userId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    if (subscription.length === 0) {
      return false;
    }

    const sub = subscription[0];
    
    // Check if subscription is still valid (not expired)
    if (sub.current_period_end && new Date() > sub.current_period_end) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

/**
 * Get user's current subscription details
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId))
      .orderBy(subscriptions.created_at)
      .limit(1);

    if (subscription.length === 0) {
      return null;
    }

    return subscription[0] as UserSubscription;
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }
}

/**
 * Check if user can create alerts (has active subscription)
 */
export async function canCreateAlerts(userId: string): Promise<boolean> {
  return await hasActiveSubscription(userId);
}

/**
 * Get subscription status for UI display
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  hasSubscription: boolean;
  isActive: boolean;
  subscription: UserSubscription | null;
}> {
  const subscription = await getUserSubscription(userId);
  
  return {
    hasSubscription: subscription !== null,
    isActive: subscription?.status === "active" && 
             (!subscription.current_period_end || new Date() <= subscription.current_period_end),
    subscription,
  };
}