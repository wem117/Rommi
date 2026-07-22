"use client";

import { Loader2, Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { formatNumber } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from "@/lib/data/public-settings";
import {
  computeHomepageStats,
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  type HomepageStatsConfig
} from "@/lib/utils/homepage-stats";

type Settings = {
  featuredListingsLimit: number;
  featuredRoommatesLimit: number;
  maintenanceMode: boolean;
  adminEmails: string[];
  platform: PlatformSettings;
  homepageStats: HomepageStatsConfig;
};

type StatMetricKey = "listings" | "students" | "matches";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [platformDraft, setPlatformDraft] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [statsDraft, setStatsDraft] = useState<HomepageStatsConfig>(DEFAULT_HOMEPAGE_STATS_CONFIG);

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
      setPlatformDraft({ ...DEFAULT_PLATFORM_SETTINGS, ...json.settings.platform });
      setStatsDraft({ ...DEFAULT_HOMEPAGE_STATS_CONFIG, ...json.settings.homepageStats });
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

  function savePlatform() {
    void save({ platform: platformDraft });
  }

  function saveStats() {
    void save({ homepageStats: statsDraft });
  }

  function updateStatMetric(metric: StatMetricKey, field: "base" | "growthMin" | "growthMax", value: number) {
    setStatsDraft((prev) => ({ ...prev, [metric]: { ...prev[metric], [field]: value } }));
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
          <CardTitle>Site identity &amp; SEO</CardTitle>
          <CardDescription>Site name, logo, favicon, and default search-engine metadata.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="site-name">Site name</Label>
            <Input
              id="site-name"
              value={platformDraft.siteName}
              onChange={(e) => setPlatformDraft({ ...platformDraft, siteName: e.target.value })}
              placeholder="Roomi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="default-language">Default language</Label>
            <Select
              value={platformDraft.defaultLanguage}
              onValueChange={(value) => setPlatformDraft({ ...platformDraft, defaultLanguage: value })}
            >
              <SelectTrigger id="default-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="kz">Қазақша</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <AdminImageUpload value={platformDraft.logoUrl} onChange={(url) => setPlatformDraft({ ...platformDraft, logoUrl: url })} placeholder="Logo URL" />
          </div>
          <div className="space-y-1.5">
            <Label>Favicon</Label>
            <AdminImageUpload value={platformDraft.faviconUrl} onChange={(url) => setPlatformDraft({ ...platformDraft, faviconUrl: url })} placeholder="Favicon URL" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="seo-title">SEO title</Label>
            <Input
              id="seo-title"
              value={platformDraft.seoTitle}
              onChange={(e) => setPlatformDraft({ ...platformDraft, seoTitle: e.target.value })}
              placeholder="Roomi — Student Roommates & Rooms in Kazakhstan"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="seo-description">SEO description</Label>
            <Textarea
              id="seo-description"
              rows={2}
              value={platformDraft.seoDescription}
              onChange={(e) => setPlatformDraft({ ...platformDraft, seoDescription: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="analytics-ga">Google Analytics ID</Label>
            <Input
              id="analytics-ga"
              value={platformDraft.analyticsGaId}
              onChange={(e) => setPlatformDraft({ ...platformDraft, analyticsGaId: e.target.value })}
              placeholder="G-XXXXXXXXXX"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Contact &amp; social</CardTitle>
          <CardDescription>Shown in the footer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Contact email</Label>
            <Input
              id="contact-email"
              type="email"
              value={platformDraft.contactEmail}
              onChange={(e) => setPlatformDraft({ ...platformDraft, contactEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Contact phone</Label>
            <Input
              id="contact-phone"
              value={platformDraft.contactPhone}
              onChange={(e) => setPlatformDraft({ ...platformDraft, contactPhone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-instagram">Instagram URL</Label>
            <Input
              id="social-instagram"
              value={platformDraft.socialLinks.instagram ?? ""}
              onChange={(e) => setPlatformDraft({ ...platformDraft, socialLinks: { ...platformDraft.socialLinks, instagram: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-telegram">Telegram URL</Label>
            <Input
              id="social-telegram"
              value={platformDraft.socialLinks.telegram ?? ""}
              onChange={(e) => setPlatformDraft({ ...platformDraft, socialLinks: { ...platformDraft.socialLinks, telegram: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-whatsapp">WhatsApp URL</Label>
            <Input
              id="social-whatsapp"
              value={platformDraft.socialLinks.whatsapp ?? ""}
              onChange={(e) => setPlatformDraft({ ...platformDraft, socialLinks: { ...platformDraft.socialLinks, whatsapp: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social-facebook">Facebook URL</Label>
            <Input
              id="social-facebook"
              value={platformDraft.socialLinks.facebook ?? ""}
              onChange={(e) => setPlatformDraft({ ...platformDraft, socialLinks: { ...platformDraft.socialLinks, facebook: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="footer-text">Footer copyright text (leave blank for the default)</Label>
            <Input
              id="footer-text"
              value={platformDraft.footerText}
              onChange={(e) => setPlatformDraft({ ...platformDraft, footerText: e.target.value })}
              placeholder={`© ${new Date().getUTCFullYear()} Roomi. All rights reserved.`}
            />
          </div>
        </CardContent>
        <CardContent>
          <Button onClick={savePlatform} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save site settings
          </Button>
        </CardContent>
      </Card>

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
          <CardTitle>Homepage statistics</CardTitle>
          <CardDescription>
            The animated trust numbers in the hero. Each metric has a base value and a daily growth range; the shown
            number grows deterministically from the start date (stable for all visitors, never random on refresh).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stats-start-date">Start date</Label>
              <Input
                id="stats-start-date"
                type="date"
                value={statsDraft.startDate}
                onChange={(e) => setStatsDraft({ ...statsDraft, startDate: e.target.value })}
              />
            </div>
          </div>

          {(
            [
              { key: "listings", label: "Verified listings" },
              { key: "students", label: "Active students" },
              { key: "matches", label: "Successful matches" }
            ] as { key: StatMetricKey; label: string }[]
          ).map((metric) => (
            <div key={metric.key} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{metric.label}</span>
                <span className="text-xs text-foreground/50">
                  today: {formatNumber(computeHomepageStats(statsDraft)[metric.key])}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-base`}>Base value</Label>
                  <Input
                    id={`${metric.key}-base`}
                    type="number"
                    min={0}
                    value={statsDraft[metric.key].base}
                    onChange={(e) => updateStatMetric(metric.key, "base", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-min`}>Growth/day (min)</Label>
                  <Input
                    id={`${metric.key}-min`}
                    type="number"
                    min={0}
                    value={statsDraft[metric.key].growthMin}
                    onChange={(e) => updateStatMetric(metric.key, "growthMin", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-max`}>Growth/day (max)</Label>
                  <Input
                    id={`${metric.key}-max`}
                    type="number"
                    min={0}
                    value={statsDraft[metric.key].growthMax}
                    onChange={(e) => updateStatMetric(metric.key, "growthMax", Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button onClick={saveStats} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save statistics
          </Button>
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
