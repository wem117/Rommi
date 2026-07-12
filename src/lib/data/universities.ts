import { demoUniversities } from "@/lib/data/demo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingSupabaseTable } from "@/lib/utils/errors";

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
    if (!data || data.length === 0) return demoAsPublicUniversities();
    return data.map(mapRow);
  } catch (error) {
    if (isMissingSupabaseTable(error, "universities")) return demoAsPublicUniversities();
    return demoAsPublicUniversities();
  }
}

/** Featured universities with live listing/roommate counts, for the home page hub cards. */
export async function getFeaturedUniversities(limit = 6): Promise<UniversityWithStats[]> {
  if (!isSupabaseConfigured) {
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

  try {
    const supabase = getSupabaseBrowserClient();
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

    const withStats = await Promise.all(
      data.map(async (row) => {
        const [listings, roommates] = await Promise.all([
          supabase.from("listings").select("id", { count: "exact", head: true }).eq("university", row.name).eq("removed", false),
          supabase
            .from("profiles")
            // Count by pk only: anon lacks column privileges on contact fields,
            // so `select("*")` would be rejected (see contact-privacy migration).
            .select("uid", { count: "exact", head: true })
            .eq("university", row.name)
            .eq("looking_for_apartment", true)
            .eq("onboarding_complete", true)
        ]);
        return {
          ...mapRow(row),
          listingsCount: listings.count ?? 0,
          roommatesCount: roommates.count ?? 0
        };
      })
    );

    return withStats;
  } catch {
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
}
