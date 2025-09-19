import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, alerts } from "@/db/schema";
import { NotificationService } from "@/lib/notifications";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, alertId, bountyData } = body;

    const notificationService = new NotificationService();

    if (action === "test") {
      // Test notification
      if (!alertId) {
        return NextResponse.json({ error: "Alert ID required for test" }, { status: 400 });
      }

      const alertResults = await db.select().from(alerts).where(eq(alerts.id, alertId));
      const alert = alertResults[0];
      if (!alert || alert.user_id !== session.user.id) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 });
      }

      // Convert database alert to the expected Alert interface
      const alertData = {
        id: alert.id,
        user_id: alert.user_id!,
        repo: alert.repo,
        query: alert.query,
        delivery_method: alert.delivery_method as "discord" | "webhook" | "email",
        destination: alert.destination,
        active: alert.active!,
      };

      const testResult = await notificationService.testNotification(alertData);
      return NextResponse.json({ success: testResult, message: testResult ? "Test notification sent successfully" : "Failed to send test notification" });
    }

    if (action === "process") {
      // Process alerts for new bounty
      if (!bountyData) {
        return NextResponse.json({ error: "Bounty data required" }, { status: 400 });
      }

      // Get all active alerts from database
      const activeAlerts = await db.select().from(alerts).where(eq(alerts.active, true));
      
      // Convert database alerts to the expected Alert interface
      const alertsData = activeAlerts.map(alert => ({
        id: alert.id,
        user_id: alert.user_id!,
        repo: alert.repo,
        query: alert.query,
        delivery_method: alert.delivery_method as "discord" | "webhook" | "email",
        destination: alert.destination,
        active: alert.active!,
      }));

      const results = await notificationService.processAlertsForBounties([bountyData], alertsData);
      return NextResponse.json({ processed: results.processed, sent: results.sent, failed: results.failed, results: results.results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Notification API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("alertId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get notifications for user's alerts only
    const query = db
      .select({
        id: notifications.id,
        issue_id: notifications.issue_id,
        alert_id: notifications.alert_id,
        sent_at: notifications.sent_at,
        delivery_method: notifications.delivery_method,
        status: notifications.status,
        error_message: notifications.error_message,
      })
      .from(notifications)
      .innerJoin(alerts, eq(notifications.alert_id, alerts.id))
      .where(eq(alerts.user_id, session.user.id))
      .orderBy(desc(notifications.sent_at))
      .limit(limit);

    const results = await query;

    return NextResponse.json({ notifications: results });
  } catch (error) {
    console.error("Notification GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}