import { demoListings } from "@/lib/data/demo";
import { getUniversityCity } from "@/lib/constants/universities";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapListingRow } from "@/lib/supabase/mappers";
import { isMissingSupabaseTable } from "@/lib/utils/errors";
import type { Listing } from "@/types/listing";

export interface ListingFiltersInput {
  city?: string;
  university?: string;
  listingType?: Listing["listingType"] | "";
  propertyType?: Listing["propertyType"] | "";
  minRent?: number | "";
  maxRent?: number | "";
  genderPreference?: Listing["preferences"]["genderPreference"] | "";
  smoking?: Listing["preferences"]["smoking"] | "";
  pets?: Listing["preferences"]["pets"] | "";
  search?: string;
  sort?: "newest" | "rent_asc" | "rent_desc";
}

function filterListings(listings: Listing[], filters: ListingFiltersInput = {}) {
  const query = filters.search?.trim().toLowerCase() ?? "";

  let next = listings.filter((listing) => {
    const hidden = "removed" in listing && Boolean((listing as Listing & { removed?: boolean }).removed);
    const matchesCity = !filters.city || listing.city === filters.city;
    const matchesUniversity =
      !filters.university ||
      listing.university === filters.university ||
      (!listing.university && listing.city === getUniversityCity(filters.university));
    const matchesType = !filters.listingType || listing.listingType === filters.listingType;
    const matchesPropertyType = !filters.propertyType || listing.propertyType === filters.propertyType;
    const matchesMin = !filters.minRent || listing.monthlyRent >= Number(filters.minRent);
    const matchesMax = !filters.maxRent || listing.monthlyRent <= Number(filters.maxRent);
    const matchesGender = !filters.genderPreference || listing.preferences.genderPreference === filters.genderPreference;
    const matchesSmoking = !filters.smoking || listing.preferences.smoking === filters.smoking;
    const matchesPets = !filters.pets || listing.preferences.pets === filters.pets;
      const matchesSearch =
        !query ||
        [listing.title, listing.description, listing.city, listing.district, listing.address]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(query));

    return (
      !hidden &&
      matchesCity &&
      matchesUniversity &&
      matchesType &&
      matchesPropertyType &&
      matchesMin &&
      matchesMax &&
      matchesGender &&
      matchesSmoking &&
      matchesPets &&
      matchesSearch
    );
  });

  if (filters.sort === "rent_asc") {
    next = next.sort((a, b) => a.monthlyRent - b.monthlyRent);
  } else if (filters.sort === "rent_desc") {
    next = next.sort((a, b) => b.monthlyRent - a.monthlyRent);
  } else {
    next = next.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return next;
}

export async function getListings(filters: ListingFiltersInput = {}, page = 1, pageSize = 9) {
  if (!isSupabaseConfigured) {
    const filtered = filterListings(demoListings, filters);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);
    return { listings: paged, hasMore: start + pageSize < filtered.length };
  }

  const supabase = getSupabaseBrowserClient();
  function buildQuery(includeRemovedFilter: boolean) {
    let query = supabase.from("listings").select("*", { count: "exact" });

    if (includeRemovedFilter) {
      query = query.or("removed.is.null,removed.eq.false");
    }

    if (filters.city) query = query.eq("city", filters.city);
    if (filters.university) {
      const fallbackCity = getUniversityCity(filters.university);
      query = query.or(`university.eq.${filters.university},and(university.is.null,city.eq.${fallbackCity}),and(university.eq.,city.eq.${fallbackCity})`);
    }
    if (filters.listingType) query = query.eq("listing_type", filters.listingType);
    if (filters.propertyType) query = query.eq("property_type", filters.propertyType);
    if (filters.genderPreference) query = query.eq("preferences->>genderPreference", filters.genderPreference);
    if (filters.smoking) query = query.eq("preferences->>smoking", filters.smoking);
    if (filters.pets) query = query.eq("preferences->>pets", filters.pets);
    if (filters.minRent !== undefined && filters.minRent !== "") {
      query = query.gte("monthly_rent", Number(filters.minRent));
    }
    if (filters.maxRent !== undefined && filters.maxRent !== "") {
      query = query.lte("monthly_rent", Number(filters.maxRent));
    }

    const search = filters.search?.trim().replace(/[%,()]/g, " ").trim();
    if (search) {
      const pattern = `%${search}%`;
      query = query.or(
        `title.ilike.${pattern},description.ilike.${pattern},city.ilike.${pattern},district.ilike.${pattern},address.ilike.${pattern}`
      );
    }

    if (filters.sort === "rent_asc") query = query.order("monthly_rent", { ascending: true });
    else if (filters.sort === "rent_desc") query = query.order("monthly_rent", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    return query;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let { data, count, error } = await buildQuery(true).range(from, to);

  if (error && /removed/i.test(String(error.message ?? ""))) {
    const retried = await buildQuery(false).range(from, to);
    data = retried.data;
    count = retried.count;
    error = retried.error;
  }

  if (error && isMissingSupabaseTable(error, "listings")) {
    const filtered = filterListings(demoListings, filters);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);
    return { listings: paged, hasMore: start + pageSize < filtered.length };
  }

  if (error) throw error;
  const listings = (data ?? []).map(mapListingRow);
  return { listings, hasMore: (count ?? 0) > page * pageSize };
}

/** Admin-curated listings for the home page. Falls back to demo listings when none are featured. */
export async function getFeaturedListings(limit = 6): Promise<Listing[]> {
  if (!isSupabaseConfigured) {
    return demoListings.filter((listing) => !listing.removed).slice(0, limit);
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("featured", true)
      .eq("removed", false)
      .order("featured_position", { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return demoListings.filter((listing) => !listing.removed).slice(0, limit);
    return data.map(mapListingRow);
  } catch {
    return demoListings.filter((listing) => !listing.removed).slice(0, limit);
  }
}

export async function getListingById(listingId: string) {
  if (!isSupabaseConfigured) {
    return demoListings.find((listing) => listing.id === listingId) ?? null;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();

  if (error && isMissingSupabaseTable(error, "listings")) {
    return demoListings.find((listing) => listing.id === listingId) ?? null;
  }

  if (error) throw error;
  return data ? mapListingRow(data) : null;
}
