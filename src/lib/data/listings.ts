import { demoListings } from "@/lib/data/demo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapListingRow } from "@/lib/supabase/mappers";
import type { Listing } from "@/types/listing";

export interface ListingFiltersInput {
  city?: string;
  listingType?: Listing["listingType"] | "";
  minRent?: number | "";
  maxRent?: number | "";
  search?: string;
  sort?: "newest" | "rent_asc" | "rent_desc";
}

function filterListings(listings: Listing[], filters: ListingFiltersInput = {}) {
  const query = filters.search?.trim().toLowerCase() ?? "";

  let next = listings.filter((listing) => {
    const matchesCity = !filters.city || listing.city === filters.city;
    const matchesType = !filters.listingType || listing.listingType === filters.listingType;
    const matchesMin = !filters.minRent || listing.monthlyRent >= Number(filters.minRent);
    const matchesMax = !filters.maxRent || listing.monthlyRent <= Number(filters.maxRent);
      const matchesSearch =
        !query ||
        [listing.title, listing.description, listing.city, listing.district, listing.address]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(query));

    return matchesCity && matchesType && matchesMin && matchesMax && matchesSearch;
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

  const supabase = getSupabaseBrowserClient() as any;
  let query = supabase.from("listings").select("*", { count: "exact" });

  if (filters.city) query = query.eq("city", filters.city);
  if (filters.listingType) query = query.eq("listing_type", filters.listingType);

  if (filters.sort === "rent_asc") query = query.order("monthly_rent", { ascending: true });
  else if (filters.sort === "rent_desc") query = query.order("monthly_rent", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize + 8;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  const filtered = filterListings((data ?? []).map(mapListingRow), filters).slice(0, pageSize);
  return { listings: filtered, hasMore: (count ?? 0) > page * pageSize };
}

export async function getListingById(listingId: string) {
  if (!isSupabaseConfigured) {
    return demoListings.find((listing) => listing.id === listingId) ?? null;
  }

  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).single();
  if (error) throw error;
  return data ? mapListingRow(data) : null;
}
