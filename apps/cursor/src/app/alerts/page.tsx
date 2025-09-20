"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Github, Webhook } from "lucide-react";
import { toast } from "sonner";
import { GithubSigninWrapper } from "@/components/github-signin-wrapper";

export default function AlertsPage() {
  const { data: session, isPending } = useSession();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [mentionText, setMentionText] = useState("@everyone");

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionStatus();
    }
  }, [session]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
      setSubscriptionStatus({ active: false });
    }
  };

  const createSubscriptionCheckout = async () => {
    setCreatingCheckout(true);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "create_checkout" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setCreatingCheckout(false);
    }
  };

  const setupAlert = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: "",
          query: "",
          delivery_method: webhookUrl.includes("discord.com") ? "discord" : "webhook",
          destination: `${webhookUrl}|${mentionText}`,
        }),
      });

      if (response.ok) {
        toast.success("Alert setup successfully! You'll be notified when new GitHub issues are posted.");
        setWebhookUrl("");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to setup alert");
      }
    } catch (error) {
      console.error("Failed to setup alert:", error);
      toast.error("Failed to setup alert");
    }
  };





  if (!session?.user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-zinc-400" />
            </div>
            <CardTitle className="text-2xl text-white">GitHub Issue Alerts</CardTitle>
            <CardDescription className="text-zinc-400">
              Get instant notifications whenever new issues are posted on GitHub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GithubSigninWrapper redirectTo="/alerts" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-zinc-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">GitHub Issue Alerts</h1>
          <p className="text-zinc-400">
            Get notified instantly when new issues are posted on GitHub repositories
          </p>
        </div>

        {/* Main Alert Setup Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Webhook className="h-5 w-5 text-zinc-400" />
              Setup Webhook Notifications
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Enter your Discord or Slack webhook URL to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook" className="text-zinc-300">Webhook URL</Label>
              <Input
                id="webhook"
                placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div>
              <Label htmlFor="mention" className="text-zinc-300">Mention (optional)</Label>
              <Input
                id="mention"
                placeholder="@everyone, @here, or @user_id"
                value={mentionText}
                onChange={(e) => setMentionText(e.target.value)}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <p className="text-sm text-zinc-500 mt-1">
                Add mentions to notify specific users or everyone in your channel
              </p>
            </div>

            {subscriptionStatus?.active ? (
              <Button onClick={setupAlert} className="w-full bg-white text-black hover:bg-zinc-200">
                Setup Alert
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center">
                  <p className="text-sm text-zinc-300">
                    Subscribe for $3/month to receive unlimited GitHub issue alerts
                  </p>
                </div>
                <Button 
                  onClick={createSubscriptionCheckout}
                  disabled={creatingCheckout}
                  className="w-full bg-white text-black hover:bg-zinc-200"
                >
                  {creatingCheckout ? "Creating..." : "Subscribe for $3/month"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Status */}
        {subscriptionStatus?.active && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-300">✓ Pro Plan Active</div>
                  <div className="text-sm text-zinc-500">Unlimited alerts • $3/month</div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://polar.sh/dashboard', '_blank')}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Manage Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-center text-sm text-zinc-500">
          <p>
            You'll receive notifications whenever new issues are posted on any GitHub repository.
            Perfect for staying updated on open source projects and bounty opportunities.
          </p>
        </div>
      </div>
    </div>
  );
}