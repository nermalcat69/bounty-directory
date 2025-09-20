"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Bell, Github, Mail, Webhook } from "lucide-react";
import { toast } from "sonner";
import { GithubSigninWrapper } from "@/components/github-signin-wrapper";

interface Alert {
  id: string;
  repo: string | null;
  query: string | null;
  delivery_method: "discord" | "webhook" | "email";
  destination: string;
  active: boolean;
  created_at: string;
}

export default function AlertsPage() {
  const { data: session, isPending } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    repo: string;
    query: string;
    delivery_method: "email" | "discord" | "webhook";
    destination: string;
  }>({
    repo: "",
    query: "",
    delivery_method: "email",
    destination: "",
  });

  useEffect(() => {
    if (session?.user) {
      fetchAlerts();
    } else if (!isPending) {
      setLoading(false);
    }
  }, [session, isPending]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/alerts");
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
      } else {
        toast.error("Failed to fetch alerts");
      }
    } catch (error) {
      toast.error("Error fetching alerts");
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!formData.destination.trim()) {
      toast.error("Destination is required");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: formData.repo.trim() || undefined,
          query: formData.query.trim() || undefined,
          delivery_method: formData.delivery_method,
          destination: formData.destination.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Alert created successfully");
        setFormData({ repo: "", query: "", delivery_method: "email", destination: "" });
        setShowCreateForm(false);
        fetchAlerts();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create alert");
      }
    } catch (error) {
      toast.error("Error creating alert");
    } finally {
      setCreating(false);
    }
  };

  const toggleAlert = async (alertId: string, active: boolean) => {
    try {
      const response = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId, active }),
      });

      if (response.ok) {
        toast.success(`Alert ${active ? "enabled" : "disabled"}`);
        fetchAlerts();
      } else {
        toast.error("Failed to update alert");
      }
    } catch (error) {
      toast.error("Error updating alert");
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts?id=${alertId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Alert deleted successfully");
        fetchAlerts();
      } else {
        toast.error("Failed to delete alert");
      }
    } catch (error) {
      toast.error("Error deleting alert");
    }
  };

  const getDeliveryIcon = (method: string) => {
    switch (method) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "discord":
        return <Bell className="h-4 w-4" />;
      case "webhook":
        return <Webhook className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (isPending || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-3xl font-bold mb-2">Bounty Alerts</h1>
            <p className="text-gray-600 mb-6">
              Get notified when new bounties match your criteria
            </p>
          </div>
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Sign in to manage alerts</CardTitle>
              <CardDescription>
                Create custom alerts for GitHub bounties and get notified via email, Discord, or webhooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GithubSigninWrapper />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Bounty Alerts
            </h1>
            <p className="text-gray-600 mt-2">
              Get notified when new bounties match your criteria
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Alert
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Alert</CardTitle>
              <CardDescription>
                Set up notifications for bounties that match your criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repo">Repository (optional)</Label>
                  <Input
                    id="repo"
                    placeholder="e.g., facebook/react"
                    value={formData.repo}
                    onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty to monitor all repositories
                  </p>
                </div>
                <div>
                  <Label htmlFor="query">Search Query (optional)</Label>
                  <Input
                    id="query"
                    placeholder="e.g., typescript, bug, feature"
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Keywords to filter bounties
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_method">Delivery Method</Label>
                  <Select
                    value={formData.delivery_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, delivery_method: value as "email" | "discord" | "webhook" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                      <SelectItem value="discord">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Discord Webhook
                        </div>
                      </SelectItem>
                      <SelectItem value="webhook">
                        <div className="flex items-center gap-2">
                          <Webhook className="h-4 w-4" />
                          Custom Webhook
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destination">
                    {formData.delivery_method === "email" ? "Email Address" : "Webhook URL"}
                  </Label>
                  <Input
                    id="destination"
                    type={formData.delivery_method === "email" ? "email" : "url"}
                    placeholder={
                      formData.delivery_method === "email"
                        ? "your@email.com"
                        : "https://discord.com/api/webhooks/..."
                    }
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={createAlert} disabled={creating}>
                  {creating ? "Creating..." : "Create Alert"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first alert to get notified about new bounties
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getDeliveryIcon(alert.delivery_method)}
                        <Badge variant="secondary" className="capitalize">
                          {alert.delivery_method}
                        </Badge>
                        <Badge variant={alert.active ? "default" : "secondary"}>
                          {alert.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        {alert.repo && (
                          <div className="flex items-center gap-2">
                            <Github className="h-4 w-4" />
                            <span className="font-medium">Repository:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {alert.repo}
                            </code>
                          </div>
                        )}
                        {alert.query && (
                          <div>
                            <span className="font-medium">Query:</span>
                            <span className="ml-2">{alert.query}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Destination:</span>
                          <span className="ml-2 text-gray-600">
                            {alert.delivery_method === "email" 
                              ? alert.destination 
                              : `${alert.destination.substring(0, 50)}...`}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          Created {new Date(alert.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={alert.active}
                        onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAlert(alert.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}