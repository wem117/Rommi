"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type LocaleHero = { title: string; subtitle: string };
type Hero = { en?: LocaleHero; ru?: LocaleHero; kz?: LocaleHero; imageUrl: string };
type Section = { key: string; visible: boolean };

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  universities: "University hubs",
  featured_listings: "Featured listings",
  featured_roommates: "Featured roommates",
  testimonials: "Testimonials",
  faq: "FAQ"
};

const EMPTY_LOCALE: LocaleHero = { title: "", subtitle: "" };

export default function AdminHomepagePage() {
  const [hero, setHero] = useState<Hero>({ imageUrl: "" });
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setHero({ imageUrl: "", ...json.settings.homepageHero });
      setSections(json.settings.homepageSections ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load homepage settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveHero() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepageHero: hero })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Hero content saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveSections(next: Section[]) {
    setSections(next);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepageSections: next })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      await load();
    }
  }

  function toggleSection(key: string) {
    void saveSections(sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    void saveSections(next);
  }

  function updateLocale(locale: "en" | "ru" | "kz", field: keyof LocaleHero, value: string) {
    setHero((prev) => ({ ...prev, [locale]: { ...(prev[locale] ?? EMPTY_LOCALE), [field]: value } }));
  }

  if (loading) {
    return (
      <main className="mx-auto flex max-w-3xl justify-center px-4 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Homepage</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Control the hero content and section layout of the public home page — no code changes required.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hero content</CardTitle>
          <CardDescription>Shown at the top of the home page, per language. Leave a field blank to keep the built-in default.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="hero-image">Hero image URL</Label>
            <Input id="hero-image" value={hero.imageUrl} onChange={(e) => setHero({ ...hero, imageUrl: e.target.value })} />
          </div>

          <Tabs defaultValue="en" className="mt-5">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ru">Русский</TabsTrigger>
              <TabsTrigger value="kz">Қазақша</TabsTrigger>
            </TabsList>
            {(["en", "ru", "kz"] as const).map((locale) => (
              <TabsContent key={locale} value={locale} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`hero-title-${locale}`}>Title</Label>
                  <Input
                    id={`hero-title-${locale}`}
                    value={hero[locale]?.title ?? ""}
                    onChange={(e) => updateLocale(locale, "title", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`hero-subtitle-${locale}`}>Subtitle</Label>
                  <Textarea
                    id={`hero-subtitle-${locale}`}
                    rows={3}
                    value={hero[locale]?.subtitle ?? ""}
                    onChange={(e) => updateLocale(locale, "subtitle", e.target.value)}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <Button className="mt-4" onClick={saveHero} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save hero content
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Section visibility &amp; order</CardTitle>
          <CardDescription>Toggle sections on/off and reorder how they appear on the home page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sections.map((section, index) => (
              <li
                key={section.key}
                className={`flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 ${section.visible ? "" : "opacity-50"}`}
              >
                <span className="text-sm font-semibold">{SECTION_LABELS[section.key] ?? section.key}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleSection(section.key)}>
                    {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
