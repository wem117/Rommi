import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface LocaleHero {
  title: string;
  subtitle: string;
}

export interface HomepageHero {
  en?: LocaleHero;
  ru?: LocaleHero;
  kz?: LocaleHero;
  imageUrl?: string;
}

export interface HomepageSection {
  key: string;
  visible: boolean;
}

export interface PlatformSettings {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: { instagram?: string; telegram?: string; whatsapp?: string; facebook?: string };
  footerText: string;
  seoTitle: string;
  seoDescription: string;
  analyticsGaId: string;
  defaultLanguage: string;
}

export interface PublicSettings {
  homepageHero: HomepageHero;
  homepageSections: HomepageSection[];
  maintenanceMode: boolean;
  platform: PlatformSettings;
  featuredListingsLimit: number;
  featuredRoommatesLimit: number;
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { key: "hero", visible: true },
  { key: "universities", visible: true },
  { key: "featured_listings", visible: true },
  { key: "featured_roommates", visible: true },
  { key: "testimonials", visible: true },
  { key: "faq", visible: true }
];

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: "Roomi",
  logoUrl: "",
  faviconUrl: "",
  contactEmail: "",
  contactPhone: "",
  socialLinks: {},
  footerText: "",
  seoTitle: "",
  seoDescription: "",
  analyticsGaId: "",
  defaultLanguage: "en"
};

const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  homepageHero: {},
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  maintenanceMode: false,
  platform: DEFAULT_PLATFORM_SETTINGS,
  featuredListingsLimit: 8,
  featuredRoommatesLimit: 8
};

// LocaleProvider, Footer, and the home page all read these settings on the
// same page load. Cache the in-flight/resolved request so they share one
// network round-trip instead of issuing duplicate identical queries.
let cachedSettings: Promise<PublicSettings> | null = null;

export function invalidatePublicSettingsCache() {
  cachedSettings = null;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  if (!cachedSettings) {
    cachedSettings = fetchPublicSettings();
  }
  return cachedSettings;
}

/**
 * Public (RLS-safe) subset of site_settings: homepage hero/sections,
 * maintenance mode, and platform chrome (site name, logo, footer, SEO).
 * Falls back to sensible defaults when Supabase isn't configured, the table
 * doesn't exist yet, or a key hasn't been set.
 */
async function fetchPublicSettings(): Promise<PublicSettings> {
  if (!isSupabaseConfigured) return DEFAULT_PUBLIC_SETTINGS;

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "homepage_hero",
        "homepage_sections",
        "maintenance_mode",
        "platform",
        "featured_listings_limit",
        "featured_roommates_limit"
      ]);

    if (error) throw error;
    if (!data || data.length === 0) return DEFAULT_PUBLIC_SETTINGS;

    const byKey = new Map(data.map((row) => [row.key as string, row.value]));
    return {
      homepageHero: (byKey.get("homepage_hero") as HomepageHero) ?? DEFAULT_PUBLIC_SETTINGS.homepageHero,
      homepageSections: (byKey.get("homepage_sections") as HomepageSection[]) ?? DEFAULT_HOMEPAGE_SECTIONS,
      maintenanceMode: (byKey.get("maintenance_mode") as boolean) ?? false,
      platform: { ...DEFAULT_PLATFORM_SETTINGS, ...((byKey.get("platform") as Partial<PlatformSettings>) ?? {}) },
      featuredListingsLimit: (byKey.get("featured_listings_limit") as number) ?? DEFAULT_PUBLIC_SETTINGS.featuredListingsLimit,
      featuredRoommatesLimit: (byKey.get("featured_roommates_limit") as number) ?? DEFAULT_PUBLIC_SETTINGS.featuredRoommatesLimit
    };
  } catch {
    return DEFAULT_PUBLIC_SETTINGS;
  }
}
