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
import { mapListingRow } from "@/lib/supabase/mappers";
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

  const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();
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
