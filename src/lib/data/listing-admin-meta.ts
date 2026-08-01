import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-only metadata attached to hand-seeded listings.
 *
 * Lives in `public.listing_admin_meta`, a table RLS restricts to admins, so a
 * regular user reading it gets zero rows. Nothing in this module may be spread
 * into a payload that reaches a public page — the listing itself carries no
 * trace of it, which is what keeps a seeded listing indistinguishable from an
 * organic one.
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

type MetaRow = {
  listing_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_telegram: string | null;
  source_url: string | null;
  source_note: string | null;
  admin_notes: string | null;
};

function mapMetaRow(row: MetaRow): ListingAdminMeta {
  return {
    contactName: row.contact_name ?? "",
    contactPhone: row.contact_phone ?? "",
    contactTelegram: row.contact_telegram ?? "",
    sourceUrl: row.source_url ?? "",
    sourceNote: row.source_note ?? "",
    adminNotes: row.admin_notes ?? ""
  };
}

function isMissingTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = String((error as { message?: string } | null)?.message ?? "");
  return code === "PGRST205" || code === "42P01" || /listing_admin_meta/i.test(message);
}

/** Metadata for many listings at once, keyed by listing id. */
export async function getListingAdminMetaMap(
  supabase: SupabaseClient
): Promise<Record<string, ListingAdminMeta>> {
  try {
    const { data, error } = await supabase.from("listing_admin_meta").select("*");
    if (error) throw error;
    const out: Record<string, ListingAdminMeta> = {};
    for (const row of (data ?? []) as MetaRow[]) out[row.listing_id] = mapMetaRow(row);
    return out;
  } catch (error) {
    // The admin panel must keep working before this migration is applied.
    if (isMissingTable(error)) return {};
    throw error;
  }
}

export async function upsertListingAdminMeta(
  supabase: SupabaseClient,
  listingId: string,
  meta: Partial<ListingAdminMeta>
): Promise<void> {
  const payload: Record<string, unknown> = { listing_id: listingId, updated_at: new Date().toISOString() };
  if (meta.contactName !== undefined) payload.contact_name = meta.contactName;
  if (meta.contactPhone !== undefined) payload.contact_phone = meta.contactPhone;
  if (meta.contactTelegram !== undefined) payload.contact_telegram = meta.contactTelegram;
  if (meta.sourceUrl !== undefined) payload.source_url = meta.sourceUrl;
  if (meta.sourceNote !== undefined) payload.source_note = meta.sourceNote;
  if (meta.adminNotes !== undefined) payload.admin_notes = meta.adminNotes;

  // Nothing but the key was supplied — don't create an empty row.
  if (Object.keys(payload).length <= 2) return;

  // Deliberately NOT swallowed when the table is missing. Reads may degrade to
  // "no metadata", but silently dropping contact details the admin just typed
  // would lose the only record of how to reach that landlord.
  const { error } = await supabase.from("listing_admin_meta").upsert(payload, { onConflict: "listing_id" });
  if (error) throw error;
}

/**
 * Whether the admin-metadata table exists in this database.
 *
 * The admin panel uses this to hide the internal fields entirely rather than
 * offer inputs whose contents cannot be saved.
 */
export async function isListingAdminMetaAvailable(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase.from("listing_admin_meta").select("listing_id").limit(1);
    if (error) throw error;
    return true;
  } catch (error) {
    if (isMissingTable(error)) return false;
    // A permission error still means the table is there; only a missing table
    // should hide the UI.
    return true;
  }
}

/**
 * Finds listings that look like the one about to be entered.
 *
 * Seeding is copy-paste work across several chat apps, so the same flat gets
 * submitted twice easily. Matching on the source URL is exact when present;
 * otherwise a same-city address match catches the common case. This warns rather
 * than blocks — two genuinely different rooms can share a building address.
 */
export async function findPossibleDuplicates(
  supabase: SupabaseClient,
  input: { city: string; address: string; sourceUrl?: string }
): Promise<Array<{ id: string; title: string; address: string; city: string }>> {
  const matches = new Map<string, { id: string; title: string; address: string; city: string }>();

  if (input.sourceUrl?.trim()) {
    try {
      const { data } = await supabase
        .from("listing_admin_meta")
        .select("listing_id")
        .eq("source_url", input.sourceUrl.trim());
      const ids = (data ?? []).map((r) => (r as { listing_id: string }).listing_id);
      if (ids.length) {
        const { data: rows } = await supabase.from("listings").select("id, title, address, city").in("id", ids);
        for (const r of (rows ?? []) as Array<{ id: string; title: string; address: string; city: string }>) {
          matches.set(r.id, r);
        }
      }
    } catch {
      // Missing table before migration — fall through to the address check.
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
