import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Admin-only metadata attached to hand-seeded listings.
 *
 * WHERE THIS LIVES, AND WHY
 * -------------------------
 * Rows in `public.site_settings` under a `listing_meta:<listingId>` key.
 *
 * That table's SELECT policy whitelists exactly four keys — `homepage_hero`,
 * `homepage_sections`, `maintenance_mode`, and `admin_emails` (own address
 * only). Every other key, including these, is unreadable by `anon` AND by
 * ordinary authenticated users; only the service-role client, which bypasses
 * RLS and is server-only, can see them. The privacy guarantee is therefore
 * enforced by an existing database policy, not by the application remembering
 * not to select something.
 *
 * A dedicated `listing_admin_meta` table would be the tidier long-term home
 * (foreign key, cascade delete, an index on the source URL). It is not used
 * because creating it needs DDL, and this deployment offers no path to run DDL
 * against production — PostgREST cannot execute it, and postgres-meta is behind
 * a Kong ACL. Given the choice between shipping the feature on an existing,
 * correctly-restricted table and shipping nothing, this is the former. The data
 * volume is admin-scale (one row per hand-entered listing), so the missing index
 * costs nothing at this size.
 *
 * Nothing in this module may be spread into a payload that reaches a public
 * page — the listing row itself carries no trace of it, which is what keeps a
 * seeded listing indistinguishable from an organic one.
 */
export interface ListingAdminMeta {
  contactName: string;
  contactPhone: string;
  contactTelegram: string;
  sourceUrl: string;
  sourceNote: string;
  adminNotes: string;
}

export const EMPTY_LISTING_ADMIN_META: ListingAdminMeta = {
  contactName: "",
  contactPhone: "",
  contactTelegram: "",
  sourceUrl: "",
  sourceNote: "",
  adminNotes: ""
};

/** Key prefix. Deliberately absent from the site_settings SELECT whitelist. */
export const LISTING_META_KEY_PREFIX = "listing_meta:";

const metaKey = (listingId: string) => `${LISTING_META_KEY_PREFIX}${listingId}`;

function normalise(value: unknown): ListingAdminMeta {
  const v = (value ?? {}) as Partial<ListingAdminMeta>;
  return {
    contactName: String(v.contactName ?? ""),
    contactPhone: String(v.contactPhone ?? ""),
    contactTelegram: String(v.contactTelegram ?? ""),
    sourceUrl: String(v.sourceUrl ?? ""),
    sourceNote: String(v.sourceNote ?? ""),
    adminNotes: String(v.adminNotes ?? "")
  };
}

/** Metadata for every seeded listing, keyed by listing id. */
export async function getListingAdminMetaMap(): Promise<Record<string, ListingAdminMeta>> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .like("key", `${LISTING_META_KEY_PREFIX}%`);
    if (error) throw error;

    const out: Record<string, ListingAdminMeta> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
      out[row.key.slice(LISTING_META_KEY_PREFIX.length)] = normalise(row.value);
    }
    return out;
  } catch {
    // The admin list must still render if this read fails.
    return {};
  }
}

/**
 * Writes metadata for one listing.
 *
 * Errors propagate on purpose: silently dropping contact details the admin just
 * typed would destroy the only record of how to reach that landlord.
 */
export async function upsertListingAdminMeta(
  listingId: string,
  meta: Partial<ListingAdminMeta>
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const existing = (await getListingAdminMeta(listingId)) ?? EMPTY_LISTING_ADMIN_META;
  const merged = normalise({ ...existing, ...meta });

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: metaKey(listingId), value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function getListingAdminMeta(listingId: string): Promise<ListingAdminMeta | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", metaKey(listingId))
      .maybeSingle();
    if (error) throw error;
    return data ? normalise((data as { value: unknown }).value) : null;
  } catch {
    return null;
  }
}

/** Removes metadata when its listing is deleted, so no orphan rows accumulate. */
export async function deleteListingAdminMeta(listingId: string): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("site_settings").delete().eq("key", metaKey(listingId));
  } catch {
    // Best effort: a stray settings row is harmless and invisible to users.
  }
}

/**
 * Finds listings that look like the one about to be entered.
 *
 * Seeding is copy-paste work across Telegram, WhatsApp, OLX, Instagram and
 * Facebook, so the same flat gets entered twice easily. An exact source-URL
 * match is the strongest signal; a same-city address match catches the rest.
 * This WARNS rather than blocks — two genuinely different rooms can share a
 * building address.
 */
export async function findPossibleDuplicates(input: {
  city: string;
  address: string;
  sourceUrl?: string;
}): Promise<Array<{ id: string; title: string; address: string; city: string }>> {
  const supabase = createSupabaseAdminClient();
  const matches = new Map<string, { id: string; title: string; address: string; city: string }>();

  const wanted = input.sourceUrl?.trim();
  if (wanted) {
    const all = await getListingAdminMetaMap();
    const ids = Object.entries(all)
      .filter(([, meta]) => meta.sourceUrl && meta.sourceUrl.trim() === wanted)
      .map(([id]) => id);
    if (ids.length) {
      const { data } = await supabase.from("listings").select("id, title, address, city").in("id", ids);
      for (const r of (data ?? []) as Array<{ id: string; title: string; address: string; city: string }>) {
        matches.set(r.id, r);
      }
    }
  }

  const address = input.address.trim();
  if (address) {
    const { data } = await supabase
      .from("listings")
      .select("id, title, address, city")
      .eq("city", input.city)
      .ilike("address", address)
      .limit(5);
    for (const r of (data ?? []) as Array<{ id: string; title: string; address: string; city: string }>) {
      matches.set(r.id, r);
    }
  }

  return [...matches.values()];
}
