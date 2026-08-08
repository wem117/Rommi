import "server-only";

import { demoListings } from "@/lib/data/demo";
import {
  applyListingFilters,
  EMPTY_LISTING_PAGE,
  LISTINGS_PAGE_SIZE,
  rangeFor,
  totalPagesFor,
  type ListingPage,
  type ListingQueryFilters
} from "@/lib/data/listing-query";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LISTING_COLUMNS, mapListingRow } from "@/lib/supabase/mappers";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server-client";
import type { Listing } from "@/types/listing";

/**
 * Server-side listing reads for SSR + generateMetadata. Uses the anon public
 * client (no cookies), so RLS returns only publicly-visible listings
 * (approved + not removed/archived) — exactly what an anonymous crawler should
 * see. Contact/owner details are resolved separately on the client for signed-in
 * users, so nothing private is server-rendered.
 */
export async function getListingByIdServer(listingId: string): Promise<Listing | null> {
  if (!isSupabaseConfigured) {
    return demoListings.find((listing) => listing.id === listingId && !listing.removed) ?? null;
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", listingId).maybeSingle();
  if (error || !data) return null;
  return mapListingRow(data);
}

/**
 * One page of the public /rooms browse, for SSR.
 *
 * Uses the same `applyListingFilters` as the client, so the server-rendered
 * HTML and any later client fetch cannot drift apart, and returns the same
 * `count: "exact"` total — which is what makes the counter correct in the very
 * first byte of HTML rather than after hydration.
 *
 * Runs through the anon public client (no cookies), so RLS returns exactly what
 * an anonymous crawler should see.
 */
export async function getListingsPageServer(
  filters: ListingQueryFilters = {},
  page = 1,
  pageSize = LISTINGS_PAGE_SIZE
): Promise<ListingPage> {
  const safePage = Math.max(1, page);
  const { from, to } = rangeFor(safePage, pageSize);

  if (!isSupabaseConfigured) {
    const visible = demoListings.filter((listing) => !listing.removed);
    return {
      listings: visible.slice(from, from + pageSize),
      total: visible.length,
      page: safePage,
      pageSize,
      totalPages: totalPagesFor(visible.length, pageSize)
    };
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return { ...EMPTY_LISTING_PAGE, page: safePage, pageSize };

  const run = (includeRemovedFilter: boolean) =>
    applyListingFilters(
      supabase.from("listings").select(LISTING_COLUMNS, { count: "exact" }),
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

  // SSR must not 500 the whole browse page over a listings read; an empty page
  // still renders the filter bar and the shell.
  if (error || !data) return { ...EMPTY_LISTING_PAGE, page: safePage, pageSize };

  const total = count ?? 0;
  return {
    listings: data.map(mapListingRow),
    total,
    page: safePage,
    pageSize,
    totalPages: totalPagesFor(total, pageSize)
  };
}

export interface ListingFilterInventory {
  /** Cities with at least one live listing, most-listings-first. */
  cities: string[];
  /** Universities with at least one live listing. */
  universities: string[];
}

/**
 * Which cities and universities are worth offering in the /rooms filter bar.
 *
 * The dropdowns used a static list of every Kazakhstani city and every seeded
 * university — 17 cities and 30 universities — when the live inventory covers
 * 2 cities and 8 universities. Picking any of the other 22 universities was
 * guaranteed to return an empty page; there was no way to tell which ones
 * would from the dropdown itself.
 *
 * Two plain columns, not a `count(*) group by`: the JS client has no native
 * DISTINCT, and with the browse table in the hundreds of rows rather than
 * millions, fetching `city,university` for every live listing and deduping in
 * memory is simpler than reaching for an RPC and just as cheap.
 */
export async function getListingFilterInventoryServer(): Promise<ListingFilterInventory> {
  if (!isSupabaseConfigured) {
    const visible = demoListings.filter((listing) => !listing.removed);
    return {
      cities: dedupeCounted(visible.map((l) => l.city)),
      universities: dedupeCounted(visible.map((l) => l.university).filter((u): u is string => Boolean(u)))
    };
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return { cities: [], universities: [] };

  const { data, error } = await supabase
    .from("listings")
    .select("city,university")
    .eq("status", "approved")
    .or("removed.is.null,removed.eq.false");

  if (error || !data) return { cities: [], universities: [] };

  return {
    cities: dedupeCounted(data.map((row) => row.city as string).filter(Boolean)),
    universities: dedupeCounted(
      data.map((row) => row.university as string | null).filter((u): u is string => Boolean(u))
    )
  };
}

/** Distinct values, ordered by how many rows carried them — the most useful
 *  cities and universities sort to the top of the dropdown instead of A-Z. */
export function dedupeCounted(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}
