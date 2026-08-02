import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * WhatsApp and Instagram contacts for a profile.
 *
 * WHY THESE TWO LIVE APART FROM `telegram` AND `phone`
 * ----------------------------------------------------
 * `public.profiles` has `telegram` and `phone` columns; it has no `whatsapp` or
 * `instagram` column, and this deployment offers no way to run DDL against
 * production (PostgREST cannot execute it, postgres-meta is behind a Kong ACL).
 * So the two new handles are stored in `public.site_settings` under a
 * `contact:<uid>` key, exactly like the admin listing metadata.
 *
 * That choice also preserves the privacy boundary the schema already draws, and
 * this is the part worth not breaking. `20240101000300_contact_privacy.sql`
 * revokes table-wide SELECT on `profiles` from `anon` and re-grants only the
 * safe columns — `email`, `telegram` and `phone` are deliberately excluded, so
 * an anonymous visitor cannot harvest contacts through PostgREST with the
 * public anon key. The obvious no-DDL alternative, stashing the handles in the
 * `lifestyle` jsonb, is granted to `anon` and would hand exactly that data back
 * to scrapers. `site_settings` goes the other way: its SELECT policy whitelists
 * four keys and `contact:` is not one of them, so neither `anon` nor an ordinary
 * authenticated user can read these rows directly. They reach a visitor only
 * through a server component that has already passed `requirePageAuth`, which
 * is the same "signed-in users only" rule the columns follow.
 *
 * When a `whatsapp`/`instagram` column does become possible, move the values and
 * delete this module; nothing else depends on the storage shape.
 */
export interface PublicContacts {
  whatsapp: string;
  instagram: string;
}

export const EMPTY_PUBLIC_CONTACTS: PublicContacts = { whatsapp: "", instagram: "" };

/** Key prefix. Deliberately absent from the site_settings SELECT whitelist. */
export const PUBLIC_CONTACT_KEY_PREFIX = "contact:";

const contactKey = (uid: string) => `${PUBLIC_CONTACT_KEY_PREFIX}${uid}`;

function normalise(value: unknown): PublicContacts {
  const v = (value ?? {}) as Partial<PublicContacts>;
  return {
    whatsapp: String(v.whatsapp ?? ""),
    instagram: String(v.instagram ?? "")
  };
}

/**
 * Writes a profile's WhatsApp/Instagram handles.
 *
 * Writing two empty strings deletes the row rather than storing a pair of
 * blanks, so "the admin cleared these fields" and "this profile never had them"
 * stay the same state.
 */
export async function upsertPublicContacts(uid: string, contacts: Partial<PublicContacts>): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const merged = normalise({ ...(await getPublicContacts(uid)), ...contacts });

  if (!merged.whatsapp && !merged.instagram) {
    await supabase.from("site_settings").delete().eq("key", contactKey(uid));
    return;
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: contactKey(uid), value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function getPublicContacts(uid: string): Promise<PublicContacts> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", contactKey(uid))
      .maybeSingle();
    if (error) throw error;
    return data ? normalise((data as { value: unknown }).value) : EMPTY_PUBLIC_CONTACTS;
  } catch {
    // A contact block that renders one link short beats a page that 500s.
    return EMPTY_PUBLIC_CONTACTS;
  }
}

/** Handles for several profiles at once, keyed by uid. Used by the admin list. */
export async function getPublicContactsMap(uids: string[]): Promise<Record<string, PublicContacts>> {
  if (!uids.length) return {};
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", uids.map(contactKey));
    if (error) throw error;

    const out: Record<string, PublicContacts> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
      out[row.key.slice(PUBLIC_CONTACT_KEY_PREFIX.length)] = normalise(row.value);
    }
    return out;
  } catch {
    return {};
  }
}

/** Removes the row when its profile is deleted, so no orphans accumulate. */
export async function deletePublicContacts(uid: string): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("site_settings").delete().eq("key", contactKey(uid));
  } catch {
    // Best effort: a stray settings row is invisible to users.
  }
}
