import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { HomepageHero, HomepageSection } from "@/lib/validations/site-settings.schema";

export interface SiteSettings {
  featuredListingsLimit: number;
  featuredRoommatesLimit: number;
  maintenanceMode: boolean;
  adminEmails: string[];
  homepageHero: HomepageHero;
  homepageSections: HomepageSection[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  featuredListingsLimit: 8,
  featuredRoommatesLimit: 8,
  maintenanceMode: false,
  adminEmails: [],
  homepageHero: { imageUrl: "" },
  homepageSections: [
    { key: "hero", visible: true },
    { key: "universities", visible: true },
    { key: "featured_listings", visible: true },
    { key: "featured_roommates", visible: true },
    { key: "testimonials", visible: true },
    { key: "faq", visible: true }
  ]
};

const KEY_MAP: Record<keyof SiteSettings, string> = {
  featuredListingsLimit: "featured_listings_limit",
  featuredRoommatesLimit: "featured_roommates_limit",
  maintenanceMode: "maintenance_mode",
  adminEmails: "admin_emails",
  homepageHero: "homepage_hero",
  homepageSections: "homepage_sections"
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error || !data) return DEFAULT_SITE_SETTINGS;

    const byKey = new Map(data.map((row) => [row.key as string, row.value]));
    return {
      featuredListingsLimit:
        (byKey.get("featured_listings_limit") as number) ?? DEFAULT_SITE_SETTINGS.featuredListingsLimit,
      featuredRoommatesLimit:
        (byKey.get("featured_roommates_limit") as number) ?? DEFAULT_SITE_SETTINGS.featuredRoommatesLimit,
      maintenanceMode: (byKey.get("maintenance_mode") as boolean) ?? DEFAULT_SITE_SETTINGS.maintenanceMode,
      adminEmails: (byKey.get("admin_emails") as string[]) ?? DEFAULT_SITE_SETTINGS.adminEmails,
      homepageHero: (byKey.get("homepage_hero") as HomepageHero) ?? DEFAULT_SITE_SETTINGS.homepageHero,
      homepageSections:
        (byKey.get("homepage_sections") as HomepageSection[]) ?? DEFAULT_SITE_SETTINGS.homepageSections
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function updateSiteSettings(partial: Partial<SiteSettings>) {
  const supabase = createSupabaseAdminClient();
  const rows = (Object.entries(partial) as [keyof SiteSettings, unknown][]).map(([key, value]) => ({
    key: KEY_MAP[key],
    value,
    updated_at: new Date().toISOString()
  }));
  if (rows.length === 0) return;

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}
