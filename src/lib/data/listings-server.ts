import "server-only";

import { demoListings } from "@/lib/data/demo";
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
 * First page of the public /rooms browse (newest, no filters), for SSR. Mirrors
 * the default query in getListings() so the server-rendered HTML matches what the
 * client shows before any filter is applied.
 */
export async function getListingsFirstPageServer(
  pageSize = 9
): Promise<{ listings: Listing[]; hasMore: boolean }> {
  if (!isSupabaseConfigured) {
    const visible = demoListings.filter((listing) => !listing.removed);
    return { listings: visible.slice(0, pageSize), hasMore: visible.length > pageSize };
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return { listings: [], hasMore: false };

  const { data, count, error } = await supabase
    .from("listings")
    .select("*", { count: "estimated" })
    .order("created_at", { ascending: false })
    .range(0, pageSize - 1);

  if (error || !data) return { listings: [], hasMore: false };
  return { listings: data.map(mapListingRow), hasMore: (count ?? 0) > pageSize };
}

/** Public listing ids for the sitemap. */
export async function getPublicListingIndex(
  limit = 5000
): Promise<Array<{ id: string; updatedAt: string }>> {
  if (!isSupabaseConfigured) {
    return demoListings
      .filter((listing) => !listing.removed)
      .map((listing) => ({ id: listing.id, updatedAt: listing.createdAt.toISOString() }));
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("id, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => ({
    id: String((row as { id: string }).id),
    updatedAt: String((row as { updated_at?: string }).updated_at ?? new Date().toISOString())
  }));
}
