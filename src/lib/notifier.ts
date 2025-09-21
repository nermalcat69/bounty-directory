import "server-only";

import { db } from "@/db";
import { notifications, issues, alerts } from "@/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";

export interface NotificationPayload {
  issue: {
    id: string;
    title: string;
    body: string;
    html_url: string;
    user_login: string;
    user_avatar_url: string;
    repo: string;
    labels: string;
  };
  alert: {
    id: string;
    delivery_method: string;
    destination: string;
  };
}

export interface DeliveryResult {
  success: boolean;
  error?: string;
  responseData?: any;
}

export class NotificationService {
  private maxRetries = 3;
  private retryDelayMs = 5000; // 5 seconds

  /**
   * Process pending notifications with delivery tracking
   */
  async processPendingNotifications(): Promise<{
    processed: number;
    delivered: number;
    failed: number;
  }> {
    console.log("Processing pending notifications...");

    // Get pending notifications with issue and alert details
    const pendingNotifications = await db
      .select({
        notification: notifications,
        issue: issues,
        alert: alerts,
      })
      .from(notifications)
      .innerJoin(issues, eq(notifications.issue_id, issues.id))
      .innerJoin(alerts, eq(notifications.alert_id, alerts.id))
      .where(
        and(
          eq(notifications.status, "pending"),
          eq(notifications.delivered, false),
          lt(notifications.attempts, this.maxRetries)
        )
      )
      .limit(100); // Process in batches

    let processed = 0;
    let delivered = 0;
    let failed = 0;

    for (const { notification, issue, alert } of pendingNotifications) {
      try {
        const payload: NotificationPayload = {
          issue: {
            id: issue.id,
            title: issue.title || "",
            body: issue.body || "",
            html_url: issue.html_url || "",
            user_login: issue.user_login || "",
            user_avatar_url: issue.user_avatar_url || "",
            repo: issue.repo,
            labels: issue.labels || "[]",
          },
          alert: {
            id: alert.id,
            delivery_method: alert.delivery_method,
            destination: alert.destination,
          },
        };

        const result = await this.deliverNotification(payload);
        
        if (result.success) {
          // Mark as delivered
          await db
            .update(notifications)
            .set({
              status: "delivered",
              delivered: true,
              response_data: result.responseData ? JSON.stringify(result.responseData) : null,
            })
            .where(eq(notifications.id, notification.id));
          
          delivered++;
          console.log(`✅ Delivered notification ${notification.id} via ${alert.delivery_method}`);
        } else {
          // Increment attempts and update status
          const newAttempts = notification.attempts + 1;
          const newStatus = newAttempts >= this.maxRetries ? "failed" : "pending";
          
          await db
            .update(notifications)
            .set({
              attempts: newAttempts,
              status: newStatus,
              response_data: result.error ? JSON.stringify({ error: result.error }) : null,
            })
            .where(eq(notifications.id, notification.id));
          
          if (newStatus === "failed") {
            failed++;
            console.error(`❌ Failed notification ${notification.id} after ${newAttempts} attempts: ${result.error}`);
          } else {
            console.warn(`⚠️ Retry ${newAttempts}/${this.maxRetries} for notification ${notification.id}: ${result.error}`);
          }
        }
        
        processed++;
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
        // Update attempts even on unexpected errors
        await db
          .update(notifications)
          .set({
            attempts: notification.attempts + 1,
            status: notification.attempts + 1 >= this.maxRetries ? "failed" : "pending",
            response_data: JSON.stringify({ error: String(error) }),
          })
          .where(eq(notifications.id, notification.id));
        
        failed++;
        processed++;
      }
    }

    console.log(`Notification processing complete: ${processed} processed, ${delivered} delivered, ${failed} failed`);
    
    return { processed, delivered, failed };
  }

  /**
   * Deliver a notification based on the delivery method
   */
  private async deliverNotification(payload: NotificationPayload): Promise<DeliveryResult> {
    const { alert } = payload;

    switch (alert.delivery_method) {
      case "email":
        return this.deliverEmail(payload);
      case "webhook":
        return this.deliverWebhook(payload);
      case "discord":
        return this.deliverDiscord(payload);
      default:
        return {
          success: false,
          error: `Unsupported delivery method: ${alert.delivery_method}`,
        };
    }
  }

  /**
   * Deliver notification via email (using Resend)
   */
  private async deliverEmail(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      const { issue, alert } = payload;
      
      // This would integrate with Resend API
      // For now, we'll simulate the delivery
      console.log(`📧 Sending email notification to ${alert.destination} for issue: ${issue.title}`);
      
      // TODO: Implement actual email delivery with Resend
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from: 'bounties@yourdomain.com',
      //     to: alert.destination,
      //     subject: `New Bounty: ${issue.title}`,
      //     html: this.generateEmailTemplate(issue),
      //   }),
      // });
      
      return {
        success: true,
        responseData: { method: "email", destination: alert.destination },
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Deliver notification via webhook
   */
  private async deliverWebhook(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      const { issue, alert } = payload;
      
      const response = await fetch(alert.destination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BountyDirectory/1.0",
        },
        body: JSON.stringify({
          type: "new_bounty",
          issue,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json().catch(() => ({}));
      
      return {
        success: true,
        responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Deliver notification via Discord webhook
   */
  private async deliverDiscord(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      const { issue } = payload;
      
      const embed = {
        title: issue.title,
        description: issue.body?.substring(0, 500) + (issue.body && issue.body.length > 500 ? "..." : ""),
        url: issue.html_url,
        color: 0x00ff00, // Green
        author: {
          name: issue.user_login,
          icon_url: issue.user_avatar_url || `https://github.com/${issue.user_login}.png`,
        },
        fields: [
          {
            name: "Repository",
            value: issue.repo,
            inline: true,
          },
          {
            name: "Labels",
            value: JSON.parse(issue.labels).join(", ") || "None",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(payload.alert.destination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        responseData: { messageId: response.headers.get("x-message-id") },
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    pending: number;
    delivered: number;
    failed: number;
    total: number;
  }> {
    const stats = await db
      .select({
        status: notifications.status,
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .groupBy(notifications.status);

    const result = {
      pending: 0,
      delivered: 0,
      failed: 0,
      total: 0,
    };

    for (const stat of stats) {
      const count = Number(stat.count);
      result.total += count;
      
      if (stat.status === "pending") result.pending = count;
      else if (stat.status === "delivered") result.delivered = count;
      else if (stat.status === "failed") result.failed = count;
    }

    return result;
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .delete(notifications)
      .where(lt(notifications.created_at, thirtyDaysAgo));

    const deletedCount = Array.isArray(result) ? result.length : 0;
    console.log(`Cleaned up ${deletedCount} old notifications`);
    return deletedCount;
  }
}

export const notificationService = new NotificationService();