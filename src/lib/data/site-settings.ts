import "server-only";

import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from "@/lib/data/public-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  normalizeStatsConfig,
  type HomepageStatsConfig
} from "@/lib/utils/homepage-stats";
import type { HomepageHero, HomepageSection } from "@/lib/validations/site-settings.schema";

/** Automatic publishing of Telegram imports. Off unless an operator says so. */
export interface TelegramPublishSettings {
  enabled: boolean;
  minConfidence: number;
  requirePhotos: boolean;
}

export const DEFAULT_TELEGRAM_PUBLISH: TelegramPublishSettings = {
  enabled: false,
  minConfidence: 75,
  requirePhotos: false
};

export interface SiteSettings {
  featuredListingsLimit: number;
  featuredRoommatesLimit: number;
  maintenanceMode: boolean;
  adminEmails: string[];
  homepageHero: HomepageHero;
  homepageSections: HomepageSection[];
  homepageStats: HomepageStatsConfig;
  telegramPublish: TelegramPublishSettings;
  platform: PlatformSettings;
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
  ],
  homepageStats: DEFAULT_HOMEPAGE_STATS_CONFIG,
  telegramPublish: DEFAULT_TELEGRAM_PUBLISH,
  platform: DEFAULT_PLATFORM_SETTINGS
};

const KEY_MAP: Record<keyof SiteSettings, string> = {
  featuredListingsLimit: "featured_listings_limit",
  featuredRoommatesLimit: "featured_roommates_limit",
  maintenanceMode: "maintenance_mode",
  adminEmails: "admin_emails",
  homepageHero: "homepage_hero",
  homepageSections: "homepage_sections",
  homepageStats: "homepage_stats",
  telegramPublish: "telegram_publish",
  platform: "platform"
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createSupabaseAdminClient();
    // `listing_meta:*` and `contact:*` rows live in this table too (see
    // lib/data/listing-admin-meta.ts and lib/data/public-contacts.ts). They are
    // per-record data, not site settings, so they are excluded here to keep this
    // response bounded as the seeded inventory grows.
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .not("key", "like", "listing_meta:%")
      .not("key", "like", "contact:%");
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
        (byKey.get("homepage_sections") as HomepageSection[]) ?? DEFAULT_SITE_SETTINGS.homepageSections,
      // Read through the normalizer so a row written in the pre-list shape
      // still renders the operator's own numbers rather than the defaults.
      homepageStats: normalizeStatsConfig(byKey.get("homepage_stats")),
      telegramPublish: {
        ...DEFAULT_TELEGRAM_PUBLISH,
        ...((byKey.get("telegram_publish") as Partial<TelegramPublishSettings>) ?? {})
      },
      platform: { ...DEFAULT_PLATFORM_SETTINGS, ...((byKey.get("platform") as Partial<PlatformSettings>) ?? {}) }
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

type SiteSettingsUpdate = Partial<Omit<SiteSettings, "platform" | "homepageStats" | "telegramPublish">> & {
  platform?: Partial<PlatformSettings>;
  homepageStats?: HomepageStatsConfig;
  telegramPublish?: TelegramPublishSettings;
};

export async function updateSiteSettings(partial: SiteSettingsUpdate) {
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
