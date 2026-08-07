import type { SupabaseClient } from "@supabase/supabase-js";

import { demoUniversities } from "@/lib/data/demo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Explicit column list. `select("*")` also shipped `created_at` and
 * `updated_at` to every visitor who opened a university picker.
 *
 * The count overrides are here because the featured hub cards read them; the
 * compiler caught their absence the moment the wildcard went away, which is the
 * argument for explicit columns in one line — under `select("*")` a missing
 * column is `undefined` at runtime, here it does not build.
 */
const UNIVERSITY_COLUMNS =
  "id,name,name_ru,name_kz,slug,city,country,type,website,language,description,image_url,logo_url,cover_image_url,position,active,featured,featured_position,listings_count_override,students_count_override" as const;

export interface PublicUniversity {
  id: string;
  /**
   * The CANONICAL name, always English.
   *
   * `listings.university` and `profiles.university` store this string as free
   * text, the combobox writes it, and the Telegram parser matches against it —
   * so it is an identifier as much as a label and must not vary by locale.
   * Display names live in `names` below.
   */
  name: string;
  /** Per-locale display names. Empty entries fall back to `name`. */
  names: { en: string; ru: string; kz: string };
  slug: string;
  city: string;
  country: string;
  /** e.g. "International branch campus". Free text — the sector has many shapes. */
  type: string;
  website: string;
  /** Language of instruction. */
  language: string;
  description: string;
  imageUrl: string;
  logoUrl: string;
}

/**
 * The name to show a reader, given their locale.
 *
 * Falls back to the canonical English name rather than rendering blank: most
 * Kazakhstani universities use their Latin name verbatim in all three
 * languages, so an empty translation is the normal case, not an error.
 */
export function universityDisplayName(
  university: Pick<PublicUniversity, "name" | "names">,
  locale: "en" | "ru" | "kz"
): string {
  return university.names?.[locale]?.trim() || university.name;
}

export interface UniversityWithStats extends PublicUniversity {
  listingsCount: number;
  roommatesCount: number;
}

type UniversityRow = {
  id: string;
  name: string;
  name_ru?: string | null;
  name_kz?: string | null;
  country?: string | null;
  type?: string | null;
  website?: string | null;
  language?: string | null;
  slug: string;
  city: string | null;
  description: string | null;
  image_url: string | null;
  logo_url: string | null;
  active: boolean;
  featured: boolean;
  position: number;
  featured_position: number | null;
  listings_count_override?: number | null;
  students_count_override?: number | null;
};

function mapRow(row: UniversityRow): PublicUniversity {
  return {
    id: row.id,
    name: row.name,
    names: { en: row.name, ru: row.name_ru ?? "", kz: row.name_kz ?? "" },
    slug: row.slug,
    city: row.city ?? "",
    country: row.country ?? "Kazakhstan",
    type: row.type ?? "",
    website: row.website ?? "",
    language: row.language ?? "",
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    logoUrl: row.logo_url ?? ""
  };
}

function demoAsPublicUniversities(): PublicUniversity[] {
  return demoUniversities.map((u) => ({
    id: u.name,
    name: u.name,
    names: { en: u.name, ru: "", kz: "" },
    slug: u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    city: u.city,
    country: "Kazakhstan",
    type: "",
    website: "",
    language: "",
    description: "",
    imageUrl: u.image,
    logoUrl: ""
  }));
}

/** Demo fallback for the home-page hub cards (single source for all fallback paths). */
function demoAsUniversitiesWithStats(limit: number): UniversityWithStats[] {
  return demoUniversities.slice(0, limit).map((u) => ({
    id: u.name,
    name: u.name,
    names: { en: u.name, ru: "", kz: "" },
    slug: u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    city: u.city,
    country: "Kazakhstan",
    type: "",
    website: "",
    language: "",
    description: "",
    imageUrl: u.image,
    logoUrl: "",
    listingsCount: u.listings,
    roommatesCount: 0
  }));
}

/**
 * Process-lifetime cache for the active university list.
 *
 * This is static configuration — an admin-curated list of thirty rows that
 * changes a few times a year — and it was being refetched on every mount of
 * every component that shows a university picker. The picker appears in the
 * /rooms filter bar, the /roommates filter bar, profile edit, onboarding, the
 * listing form and three admin screens, so simply moving between browse pages
 * re-requested the whole table, and two pickers on one screen requested it
 * twice in parallel.
 *
 * `inflight` is what makes the second case free: concurrent callers await one
 * request rather than racing. The TTL keeps an admin edit visible within a few
 * minutes without a reload, which is the right trade for data of this shape.
 */
const UNIVERSITIES_TTL_MS = 5 * 60_000;
let universitiesCache: { at: number; data: PublicUniversity[] } | null = null;
let universitiesInflight: Promise<PublicUniversity[]> | null = null;

/** Drops the cache so an admin write is reflected without a page reload. */
export function invalidateUniversitiesCache(): void {
  universitiesCache = null;
  universitiesInflight = null;
}

/** All active universities, ordered for the /universities directory page. */
export async function getActiveUniversities(): Promise<PublicUniversity[]> {
  if (!isSupabaseConfigured) return demoAsPublicUniversities();

  if (universitiesCache && Date.now() - universitiesCache.at < UNIVERSITIES_TTL_MS) {
    return universitiesCache.data;
  }
  if (universitiesInflight) return universitiesInflight;

  universitiesInflight = fetchActiveUniversities()
    .then((data) => {
      // Only a successful, non-empty read is worth caching: caching [] would
      // pin every picker to its built-in fallback list until the TTL expired.
      if (data.length > 0) universitiesCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      universitiesInflight = null;
    });

  return universitiesInflight;
}

async function fetchActiveUniversities(): Promise<PublicUniversity[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("universities")
      .select(UNIVERSITY_COLUMNS)
      .eq("active", true)
      .order("position", { ascending: true });

    if (error) throw error;
    // With Supabase configured, an empty/failed result returns [] — callers
    // (e.g. the university combobox) have their own static-constant fallback.
    return (data ?? []).map(mapRow);
  } catch (error) {
    console.warn("Failed to load universities", error);
    return [];
  }
}

/** Featured universities with live listing/roommate counts, for the home page hub cards. */
export async function getFeaturedUniversities(
  limit = 6,
  client?: SupabaseClient
): Promise<UniversityWithStats[]> {
  if (!isSupabaseConfigured) {
    return demoAsUniversitiesWithStats(limit);
  }

  try {
    const supabase = client ?? getSupabaseBrowserClient();
    const initial = await supabase
      .from("universities")
      .select(UNIVERSITY_COLUMNS)
      .eq("active", true)
      .eq("featured", true)
      .order("featured_position", { ascending: true })
      .limit(limit);

    if (initial.error) throw initial.error;
    let data = initial.data;

    if (!data || data.length === 0) {
      const fallback = await supabase
        .from("universities")
        .select(UNIVERSITY_COLUMNS)
        .eq("active", true)
        .order("position", { ascending: true })
        .limit(limit);
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    if (!data || data.length === 0) {
      // Never fabricate university hub cards when Supabase is configured.
      return [];
    }

    // Two bulk queries instead of two count queries per university (N+1):
    // fetch only the `university` column for matching rows and tally locally.
    const names = data.map((row) => row.name as string);
    const [listings, roommates] = await Promise.all([
      supabase.from("listings").select("university").in("university", names).eq("removed", false),
      supabase
        .from("profiles")
        .select("university")
        .in("university", names)
        .eq("looking_for_apartment", true)
        .eq("onboarding_complete", true)
    ]);

    const tally = (rows: Array<{ university: string | null }> | null) => {
      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        if (row.university) counts.set(row.university, (counts.get(row.university) ?? 0) + 1);
      }
      return counts;
    };

    const listingCounts = tally(listings.data);
    const roommateCounts = tally(roommates.data);

    // Admin override wins when set (not null/undefined); otherwise show the live count.
    return data.map((row) => ({
      ...mapRow(row),
      listingsCount: row.listings_count_override ?? listingCounts.get(row.name as string) ?? 0,
      roommatesCount: row.students_count_override ?? roommateCounts.get(row.name as string) ?? 0
    }));
  } catch (error) {
    console.warn("Failed to load featured universities", error);
    return [];
  }
}
