import type { SupabaseClient } from "@supabase/supabase-js";

import { demoUniversities } from "@/lib/data/demo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface PublicUniversity {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string;
  imageUrl: string;
  logoUrl: string;
}

export interface UniversityWithStats extends PublicUniversity {
  listingsCount: number;
  roommatesCount: number;
}

type UniversityRow = {
  id: string;
  name: string;
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
    slug: row.slug,
    city: row.city ?? "",
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    logoUrl: row.logo_url ?? ""
  };
}

function demoAsPublicUniversities(): PublicUniversity[] {
  return demoUniversities.map((u) => ({
    id: u.name,
    name: u.name,
    slug: u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    city: u.city,
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
    slug: u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    city: u.city,
    description: "",
    imageUrl: u.image,
    logoUrl: "",
    listingsCount: u.listings,
    roommatesCount: 0
  }));
}

/** All active universities, ordered for the /universities directory page. */
export async function getActiveUniversities(): Promise<PublicUniversity[]> {
  if (!isSupabaseConfigured) return demoAsPublicUniversities();

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("universities")
      .select("*")
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
      .select("*")
      .eq("active", true)
      .eq("featured", true)
      .order("featured_position", { ascending: true })
      .limit(limit);

    if (initial.error) throw initial.error;
    let data = initial.data;

    if (!data || data.length === 0) {
      const fallback = await supabase
        .from("universities")
        .select("*")
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
