"use client";

import { Loader2, Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Settings = {
  featuredListingsLimit: number;
  featuredRoommatesLimit: number;
  maintenanceMode: boolean;
  adminEmails: string[];
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
      setSettings(json.settings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function save(partial: Partial<Settings>) {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSettings(json.settings);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !settings) return;
    if (settings.adminEmails.includes(email)) {
      toast.error("Already in the list.");
      return;
    }
    const next = [...settings.adminEmails, email];
    setSettings({ ...settings, adminEmails: next });
    setNewEmail("");
    void save({ adminEmails: next });
  }

  function removeEmail(email: string) {
    if (!settings) return;
    const next = settings.adminEmails.filter((item) => item !== email);
    setSettings({ ...settings, adminEmails: next });
    void save({ adminEmails: next });
  }

  if (loading || !settings) {
    return (
      <main className="mx-auto flex max-w-3xl justify-center px-4 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-foreground/60">Platform-wide configuration. Changes apply immediately, no deploy required.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Maintenance mode</CardTitle>
          <CardDescription>When enabled, visitors see a maintenance page instead of the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-semibold">{settings.maintenanceMode ? "Enabled" : "Disabled"}</span>
          <Switch
            checked={settings.maintenanceMode}
            disabled={saving}
            onCheckedChange={(checked) => {
              setSettings({ ...settings, maintenanceMode: checked });
              void save({ maintenanceMode: checked });
            }}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Featured limits</CardTitle>
          <CardDescription>Maximum number of featured listings and roommates shown on the home page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="featured-listings-limit">Featured listings limit</Label>
            <Input
              id="featured-listings-limit"
              type="number"
              min={1}
              max={50}
              value={settings.featuredListingsLimit}
              onChange={(e) => setSettings({ ...settings, featuredListingsLimit: Number(e.target.value) })}
              onBlur={() => save({ featuredListingsLimit: settings.featuredListingsLimit })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="featured-roommates-limit">Featured roommates limit</Label>
            <Input
              id="featured-roommates-limit"
              type="number"
              min={1}
              max={50}
              value={settings.featuredRoommatesLimit}
              onChange={(e) => setSettings({ ...settings, featuredRoommatesLimit: Number(e.target.value) })}
              onBlur={() => save({ featuredRoommatesLimit: settings.featuredRoommatesLimit })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Admin emails</CardTitle>
          <CardDescription>
            Additional emails granted admin access, on top of the bootstrap <code>ADMIN_EMAILS</code> environment variable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {settings.adminEmails.length === 0 ? (
              <p className="text-sm text-foreground/50">No additional admin emails yet.</p>
            ) : (
              settings.adminEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5">
                  {email}
                  <button
                    type="button"
                    aria-label={`Remove ${email}`}
                    onClick={() => removeEmail(email)}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmail()}
            />
            <Button onClick={addEmail} disabled={saving}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {saving ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-foreground/50">
          <Save className="h-3.5 w-3.5 animate-pulse" /> Saving…
        </p>
      ) : null}
    </main>
  );
}
