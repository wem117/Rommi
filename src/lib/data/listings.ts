import type { SupabaseClient } from "@supabase/supabase-js";

import { demoListings } from "@/lib/data/demo";
import { getUniversityCity } from "@/lib/constants/universities";
import {
  applyListingFilters,
  EMPTY_LISTING_PAGE,
  LISTINGS_PAGE_SIZE,
  rangeFor,
  totalPagesFor,
  type ListingPage,
  type ListingQueryFilters
} from "@/lib/data/listing-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapListingRow } from "@/lib/supabase/mappers";
import { isMissingSupabaseTable } from "@/lib/utils/errors";
import type { Listing } from "@/types/listing";

/** @deprecated Use `ListingQueryFilters`; kept as an alias for existing callers. */
export type ListingFiltersInput = ListingQueryFilters;

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

/**
 * One page of listings PLUS the total number matching the filters.
 *
 * `total` is a real `count: "exact"` — a COUNT(*) computed by Postgres over the
 * same filtered set, returned in the same round trip as the rows. The previous
 * implementation deliberately avoided it and fetched `pageSize + 1` rows to
 * infer `hasMore`, which can answer "is there another page" but never "how many
 * are there"; the UI was left counting the array it happened to be holding, so
 * the header read 9 before "Load more" and 14 after. Nothing can report a
 * partial figure now because the page and the count come from one query.
 */
export async function getListings(
  filters: ListingQueryFilters = {},
  page = 1,
  pageSize = LISTINGS_PAGE_SIZE
): Promise<ListingPage> {
  const safePage = Math.max(1, page);

  if (!isSupabaseConfigured) {
    const filtered = filterListings(demoListings, filters);
    const { from } = rangeFor(safePage, pageSize);
    return {
      listings: filtered.slice(from, from + pageSize),
      total: filtered.length,
      page: safePage,
      pageSize,
      totalPages: totalPagesFor(filtered.length, pageSize)
    };
  }

  const supabase = getSupabaseBrowserClient();
  const { from, to } = rangeFor(safePage, pageSize);

  const run = (includeRemovedFilter: boolean) =>
    applyListingFilters(
      supabase.from("listings").select("*", { count: "exact" }),
      filters,
      includeRemovedFilter
    ).range(from, to);

  let { data, error, count } = await run(true);

  if (error && /removed/i.test(String(error.message ?? ""))) {
    const retried = await run(false);
    data = retried.data;
    error = retried.error;
    count = retried.count;
  }

  // With Supabase configured we never silently substitute demo data — a
  // missing table is a deployment problem to surface, not to mask.
  if (error && isMissingSupabaseTable(error, "listings")) {
    console.warn("listings table is missing — run the database migrations.");
    return { ...EMPTY_LISTING_PAGE, page: safePage, pageSize };
  }

  if (error) throw error;

  const total = count ?? 0;
  return {
    listings: (data ?? []).map(mapListingRow),
    total,
    page: safePage,
    pageSize,
    totalPages: totalPagesFor(total, pageSize)
  };
}

/**
 * Admin-curated listings for the home page. Demo data is used ONLY when
 * Supabase isn't configured; with Supabase configured, an empty or failed
 * result returns [] (the caller hides the section) — never fake listings.
 */
export async function getFeaturedListings(limit = 6, client?: SupabaseClient): Promise<Listing[]> {
  if (!isSupabaseConfigured) {
    return demoListings.filter((listing) => !listing.removed).slice(0, limit);
  }

  try {
    const supabase = client ?? getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("featured", true)
      .eq("removed", false)
      .order("featured_position", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(mapListingRow);
  } catch (error) {
    console.warn("Failed to load featured listings", error);
    return [];
  }
}

export async function getListingById(listingId: string) {
  if (!isSupabaseConfigured) {
    return demoListings.find((listing) => listing.id === listingId) ?? null;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();

  if (error && isMissingSupabaseTable(error, "listings")) {
    console.warn("listings table is missing — run the database migrations.");
    return null;
  }

  if (error) throw error;
  return data ? mapListingRow(data) : null;
}
