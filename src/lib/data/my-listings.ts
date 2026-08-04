import "server-only";

import { mapListingRow } from "@/lib/supabase/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listingStatus, type MyListingStatus } from "@/lib/utils/listing-status";
import type { Listing } from "@/types/listing";

// Re-exported so server callers have one import; the definition lives in a
// client-safe module (see listing-status.ts).
export { listingStatus };
export type { MyListingStatus };

export const MY_LISTINGS_PAGE_SIZE = 12;

export interface MyListingsQuery {
  search?: string;
  city?: string;
  status?: MyListingStatus | "all";
  sort?: "newest" | "oldest" | "updated";
  page?: number;
}

export interface MyListingsPage {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Every city the user has a listing in — drives the filter without a second query. */
  cities: string[];
}

const EMPTY: MyListingsPage = {
  listings: [],
  total: 0,
  page: 1,
  pageSize: MY_LISTINGS_PAGE_SIZE,
  totalPages: 0,
  cities: []
};

/**
 * The current user's listings, including drafts and archived ones.
 *
 * Runs through the COOKIE-scoped server client, so `select_listings_owner`
 * decides what comes back — the query never filters by owner itself. A bug in
 * this function therefore cannot leak another user's listings: the database
 * would have to be wrong too. Using the service-role client here would have made
 * this function the only thing standing between users.
 *
 * Filtering, sorting and pagination are all pushed into the query so a user with
 * many listings never transfers rows the page will not render, and `count:
 * "exact"` gives the pager a real total in the same round-trip.
 */
export async function getMyListingsServer(
  uid: string,
  query: MyListingsQuery = {}
): Promise<MyListingsPage> {
  const supabase = await createSupabaseServerClient();

  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * MY_LISTINGS_PAGE_SIZE;
  const to = from + MY_LISTINGS_PAGE_SIZE - 1;

  let builder = supabase
    .from("listings")
    .select("*", { count: "exact" })
    // Redundant next to the RLS policy, and kept deliberately: it keeps the
    // intent readable at the call site and costs nothing, since the planner
    // folds it into the same index condition.
    .eq("owner_id", uid);

  const search = query.search?.trim();
  if (search) builder = builder.ilike("title", `%${search}%`);
  if (query.city) builder = builder.eq("city", query.city);

  switch (query.status) {
    case "published":
      builder = builder.eq("removed", false).eq("archived", false).eq("status", "approved");
      break;
    case "draft":
      builder = builder.eq("removed", true).eq("archived", false);
      break;
    case "archived":
      builder = builder.eq("archived", true);
      break;
    case "rejected":
      builder = builder.eq("status", "rejected");
      break;
    default:
      break;
  }

  switch (query.sort) {
    case "oldest":
      builder = builder.order("created_at", { ascending: true });
      break;
    case "updated":
      builder = builder.order("updated_at", { ascending: false });
      break;
    default:
      builder = builder.order("created_at", { ascending: false });
  }

  const { data, error, count } = await builder.range(from, to);
  if (error || !data) return { ...EMPTY, page };

  const listings = data.map((row) => mapListingRow(row as Record<string, unknown>));
  const total = count ?? listings.length;

  // Cities for the filter come from a separate, tiny projection rather than the
  // paginated rows — otherwise the dropdown would only ever offer cities that
  // happen to appear on the current page.
  const { data: cityRows } = await supabase
    .from("listings")
    .select("city")
    .eq("owner_id", uid);

  const cities = [
    ...new Set(
      (cityRows ?? [])
        .map((row) => String((row as { city?: unknown }).city ?? "").trim())
        .filter(Boolean)
    )
  ].sort();

  return {
    listings,
    total,
    page,
    pageSize: MY_LISTINGS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / MY_LISTINGS_PAGE_SIZE)),
    cities
  };
}
