"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, X } from "lucide-react";
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
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  EMPTY_HOMEPAGE_STAT_COUNTS,
  resolveHomepageStats,
  type HomepageStatCounts,
  type HomepageStatMetric,
  type HomepageStatsConfig,
  type StatSource
} from "@/lib/utils/homepage-stats";

type Settings = {
  featuredListingsLimit: number;
  featuredRoommatesLimit: number;
  maintenanceMode: boolean;
  adminEmails: string[];
  platform: PlatformSettings;
  homepageStats: HomepageStatsConfig;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [platformDraft, setPlatformDraft] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [statsDraft, setStatsDraft] = useState<HomepageStatsConfig>(DEFAULT_HOMEPAGE_STATS_CONFIG);
  // Live counts, so the admin can see exactly what the baseline is added to.
  const [liveCounts, setLiveCounts] = useState<HomepageStatCounts>(EMPTY_HOMEPAGE_STAT_COUNTS);

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
      if (json.statCounts) setLiveCounts(json.statCounts);
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
    // Optimistic: the admin has been editing `statsDraft` all along, so the
    // screen is already correct. Committing it to `settings` up front means the
    // preview and the summary stop disagreeing during the round-trip, and
    // `save()` reconciles from the server response either way.
    setSettings((prev) => (prev ? { ...prev, homepageStats: statsDraft } : prev));
    void save({ homepageStats: statsDraft });
  }

  function updateMetric(index: number, patch: Partial<HomepageStatMetric>) {
    setStatsDraft((prev) => ({
      metrics: prev.metrics.map((metric, i) => (i === index ? { ...metric, ...patch } : metric))
    }));
  }

  function addMetric() {
    setStatsDraft((prev) => ({
      metrics: [
        ...prev.metrics,
        {
          // Unique and stable, so renaming the label later does not orphan it.
          key: `metric-${Date.now().toString(36)}`,
          labels: { en: "", ru: "", kz: "" },
          source: "manual" as StatSource,
          value: 0,
          suffix: "+",
          visible: true
        }
      ]
    }));
  }

  function removeMetric(index: number) {
    setStatsDraft((prev) => ({ metrics: prev.metrics.filter((_, i) => i !== index) }));
  }

  function moveMetric(index: number, delta: -1 | 1) {
    setStatsDraft((prev) => {
      const next = [...prev.metrics];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { metrics: next };
    });
  }

  /** What each metric will actually render as, given the live counts. */
  const previews = resolveHomepageStats(statsDraft, liveCounts, "en");

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
            The figures in the homepage hero. Add, rename, reorder or remove them here — the homepage renders
            whatever this list says, in this order, in all three languages. Each one either shows a number you set,
            or a live count from the database (with an optional amount added on top; 0 publishes the real number).
            Saving updates the homepage immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {statsDraft.metrics.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-foreground/60">
              No statistics configured — the homepage strip is hidden.
            </p>
          ) : null}

          {statsDraft.metrics.map((metric, index) => (
            <div key={metric.key} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {metric.labels.en || "(untitled statistic)"}
                </span>
                <span className="text-xs text-foreground/50">
                  shows{" "}
                  <strong className="text-foreground/80">
                    {formatNumber(previews.find((p) => p.key === metric.key)?.value ?? 0)}
                    {metric.suffix}
                  </strong>
                  {metric.source === "manual" ? null : ` (live ${formatNumber(liveCounts[metric.source])} + ${formatNumber(metric.value)})`}
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-en`}>Label (EN)</Label>
                  <Input
                    id={`${metric.key}-en`}
                    value={metric.labels.en}
                    onChange={(e) => updateMetric(index, { labels: { ...metric.labels, en: e.target.value } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-ru`}>Label (RU)</Label>
                  <Input
                    id={`${metric.key}-ru`}
                    value={metric.labels.ru}
                    onChange={(e) => updateMetric(index, { labels: { ...metric.labels, ru: e.target.value } })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-kz`}>Label (KZ)</Label>
                  <Input
                    id={`${metric.key}-kz`}
                    value={metric.labels.kz}
                    onChange={(e) => updateMetric(index, { labels: { ...metric.labels, kz: e.target.value } })}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-source`}>Value from</Label>
                  <Select
                    value={metric.source}
                    onValueChange={(source) => updateMetric(index, { source: source as StatSource })}
                  >
                    <SelectTrigger id={`${metric.key}-source`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">A number I set</SelectItem>
                      <SelectItem value="listings">Live listings count</SelectItem>
                      <SelectItem value="students">Live profiles count</SelectItem>
                      <SelectItem value="matches">Live conversations count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-value`}>
                    {metric.source === "manual" ? "Number shown" : "Added to the live count"}
                  </Label>
                  <Input
                    id={`${metric.key}-value`}
                    type="number"
                    min={0}
                    value={metric.value}
                    onChange={(e) =>
                      updateMetric(index, { value: Math.max(0, Math.trunc(Number(e.target.value)) || 0) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${metric.key}-suffix`}>Suffix</Label>
                  <Input
                    id={`${metric.key}-suffix`}
                    value={metric.suffix}
                    maxLength={4}
                    placeholder="+"
                    onChange={(e) => updateMetric(index, { suffix: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => moveMetric(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                    <span className="sr-only">Move up</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveMetric(index, 1)}
                    disabled={index === statsDraft.metrics.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    <span className="sr-only">Move down</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeMetric(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>

              <label className="mt-3 flex w-fit items-center gap-2 text-xs text-foreground/70">
                <Switch
                  checked={metric.visible}
                  onCheckedChange={(visible) => updateMetric(index, { visible })}
                />
                Shown on the homepage
              </label>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addMetric} disabled={statsDraft.metrics.length >= 12}>
            <Plus className="h-4 w-4" />
            Add a statistic
          </Button>

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
