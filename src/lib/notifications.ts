import "server-only";

export interface BountyNotification {
  id: string;
  repo: string;
  number: number;
  title: string;
  body?: string;
  html_url: string;
  user_login: string;
  created_at: string;
  labels: string[];
  language?: string;
}

export interface Alert {
  id: string;
  user_id: string;
  repo: string | null;
  query: string | null;
  delivery_method: "discord" | "webhook" | "email";
  destination: string;
  active: boolean;
}

export class NotificationService {
  /**
   * Check if a bounty matches an alert's criteria
   */
  private matchesAlert(bounty: BountyNotification, alert: Alert): boolean {
    // If alert specifies a repo, check if it matches
    if (alert.repo && alert.repo !== bounty.repo) {
      return false;
    }

    // If alert has a query, check if it matches title, body, or labels
    if (alert.query) {
      const query = alert.query.toLowerCase();
      const searchText = [
        bounty.title,
        bounty.body || "",
        ...bounty.labels,
        bounty.language || "",
      ].join(" ").toLowerCase();

      if (!searchText.includes(query)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send Discord webhook notification
   */
  private async sendDiscordNotification(
    webhookUrl: string,
    bounty: BountyNotification
  ): Promise<boolean> {
    try {
      const embed = {
        title: `🎯 New Bounty: ${bounty.title}`,
        description: bounty.body?.substring(0, 300) + (bounty.body && bounty.body.length > 300 ? "..." : ""),
        url: bounty.html_url,
        color: 0x00ff00, // Green color
        fields: [
          {
            name: "Repository",
            value: bounty.repo,
            inline: true,
          },
          {
            name: "Issue #",
            value: bounty.number.toString(),
            inline: true,
          },
          {
            name: "Author",
            value: bounty.user_login,
            inline: true,
          },
          {
            name: "Language",
            value: bounty.language || "Not specified",
            inline: true,
          },
          {
            name: "Labels",
            value: bounty.labels.length > 0 ? bounty.labels.join(", ") : "None",
            inline: false,
          },
        ],
        timestamp: bounty.created_at,
        footer: {
          text: "Bounty Directory",
          icon_url: "https://bounty.directory/favicon.ico",
        },
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to send Discord notification:", error);
      return false;
    }
  }

  /**
   * Send custom webhook notification
   */
  private async sendWebhookNotification(
    webhookUrl: string,
    bounty: BountyNotification
  ): Promise<boolean> {
    try {
      const payload = {
        type: "bounty_alert",
        bounty: {
          id: bounty.id,
          repo: bounty.repo,
          number: bounty.number,
          title: bounty.title,
          body: bounty.body,
          url: bounty.html_url,
          author: bounty.user_login,
          created_at: bounty.created_at,
          labels: bounty.labels,
          language: bounty.language,
        },
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BountyDirectory/1.0",
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to send webhook notification:", error);
      return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    email: string,
    bounty: BountyNotification
  ): Promise<boolean> {
    try {
      // For now, we'll use a simple email service
      // In production, you'd want to use a service like SendGrid, Resend, or AWS SES
      const emailData = {
        to: email,
        subject: `🎯 New Bounty Alert: ${bounty.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Bounty Alert</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">
                <a href="${bounty.html_url}" style="color: #0066cc; text-decoration: none;">
                  ${bounty.title}
                </a>
              </h3>
              <p style="margin: 5px 0; color: #666;">
                <strong>Repository:</strong> ${bounty.repo}
              </p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Issue #:</strong> ${bounty.number}
              </p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Author:</strong> ${bounty.user_login}
              </p>
              ${bounty.language ? `<p style="margin: 5px 0; color: #666;"><strong>Language:</strong> ${bounty.language}</p>` : ""}
              ${bounty.labels.length > 0 ? `<p style="margin: 5px 0; color: #666;"><strong>Labels:</strong> ${bounty.labels.join(", ")}</p>` : ""}
            </div>
            ${bounty.body ? `
              <div style="margin: 20px 0;">
                <h4 style="color: #333;">Description:</h4>
                <p style="color: #666; line-height: 1.5;">
                  ${bounty.body.substring(0, 500)}${bounty.body.length > 500 ? "..." : ""}
                </p>
              </div>
            ` : ""}
            <div style="margin: 30px 0; text-align: center;">
              <a href="${bounty.html_url}" 
                 style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Bounty on GitHub
              </a>
            </div>
            <div style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                You're receiving this because you have an active alert on 
                <a href="https://bounty.directory" style="color: #0066cc;">Bounty Directory</a>.
              </p>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                <a href="https://bounty.directory/alerts" style="color: #0066cc;">Manage your alerts</a>
              </p>
            </div>
          </div>
        `,
      };

      // This would be replaced with actual email service integration
      // For now, we'll just log it and return true
      console.log("Email notification would be sent:", emailData);
      
      // TODO: Integrate with actual email service
      // Example with Resend:
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from: 'alerts@bounty.directory',
      //     to: email,
      //     subject: emailData.subject,
      //     html: emailData.html,
      //   }),
      // });
      // return response.ok;

      return true;
    } catch (error) {
      console.error("Failed to send email notification:", error);
      return false;
    }
  }

  /**
   * Send notification based on delivery method
   */
  private async sendNotification(
    alert: Alert,
    bounty: BountyNotification
  ): Promise<boolean> {
    switch (alert.delivery_method) {
      case "discord":
        return this.sendDiscordNotification(alert.destination, bounty);
      case "webhook":
        return this.sendWebhookNotification(alert.destination, bounty);
      case "email":
        return this.sendEmailNotification(alert.destination, bounty);
      default:
        console.error("Unknown delivery method:", alert.delivery_method);
        return false;
    }
  }

  /**
   * Process alerts for new bounties
   */
  async processAlertsForBounties(
    bounties: BountyNotification[],
    alerts: Alert[]
  ): Promise<{
    processed: number;
    sent: number;
    failed: number;
    results: Array<{
      alertId: string;
      bountyId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{
      alertId: string;
      bountyId: string;
      success: boolean;
      error?: string;
    }> = [];

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const bounty of bounties) {
      for (const alert of alerts) {
        if (!alert.active) continue;

        if (this.matchesAlert(bounty, alert)) {
          processed++;
          
          try {
            const success = await this.sendNotification(alert, bounty);
            
            results.push({
              alertId: alert.id,
              bountyId: bounty.id,
              success,
            });

            if (success) {
              sent++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
            results.push({
              alertId: alert.id,
              bountyId: bounty.id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }
    }

    return {
      processed,
      sent,
      failed,
      results,
    };
  }

  /**
   * Test notification delivery
   */
  async testNotification(alert: Alert): Promise<boolean> {
    const testBounty: BountyNotification = {
      id: "test-123",
      repo: "test/repository",
      number: 123,
      title: "Test Bounty Alert",
      body: "This is a test notification to verify your alert configuration is working correctly.",
      html_url: "https://github.com/test/repository/issues/123",
      user_login: "test-user",
      created_at: new Date().toISOString(),
      labels: ["test", "alert"],
      language: "TypeScript",
    };

    return this.sendNotification(alert, testBounty);
  }
}

export const notificationService = new NotificationService();