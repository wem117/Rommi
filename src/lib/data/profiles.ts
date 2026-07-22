import type { SupabaseClient } from "@supabase/supabase-js";

import { demoProfiles } from "@/lib/data/demo";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingRpc } from "@/lib/utils/errors";
import type { UserProfile } from "@/types/user";

function sortNewest<T extends { createdAt: Date }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function hasOwnProperty<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function toProfilePayload(profile: Partial<UserProfile>) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (hasOwnProperty(profile, "uid")) payload.uid = profile.uid;
  if (hasOwnProperty(profile, "email")) payload.email = profile.email ?? null;
  if (hasOwnProperty(profile, "fullName")) payload.full_name = profile.fullName;
  if (hasOwnProperty(profile, "age")) payload.age = profile.age;
  if (hasOwnProperty(profile, "gender")) payload.gender = profile.gender;
  if (hasOwnProperty(profile, "university")) payload.university = profile.university;
  if (hasOwnProperty(profile, "occupation")) payload.occupation = profile.occupation;
  if (hasOwnProperty(profile, "minBudget")) payload.min_budget = profile.minBudget;
  if (hasOwnProperty(profile, "maxBudget")) payload.max_budget = profile.maxBudget;
  if (hasOwnProperty(profile, "preferredMoveInDate")) {
    payload.preferred_move_in_date = profile.preferredMoveInDate?.toISOString() ?? null;
  }
  if (hasOwnProperty(profile, "lifestyle")) payload.lifestyle = profile.lifestyle ?? null;
  if (hasOwnProperty(profile, "onboardingComplete")) payload.onboarding_complete = profile.onboardingComplete;
  if (hasOwnProperty(profile, "lookingForApartment")) {
    payload.looking_for_apartment = profile.lookingForApartment;
  }
  if (hasOwnProperty(profile, "photoURL")) payload.photo_url = profile.photoURL ?? null;
  if (hasOwnProperty(profile, "bio")) payload.bio = profile.bio ?? "";
  if (hasOwnProperty(profile, "telegram")) payload.telegram = profile.telegram ?? "";
  if (hasOwnProperty(profile, "phone")) payload.phone = profile.phone ?? "";
  if (hasOwnProperty(profile, "contactsHidden")) payload.contacts_hidden = profile.contactsHidden ?? false;
  // NOTE: privileged columns (role, verified, banned, suspended, featured,
  // roommate_status) are intentionally NOT written here. The browser client
  // must never send them; they are set only by admin/moderation flows via the
  // service-role client and locked at the DB (supabase-migration-privilege-columns.sql).
  if (hasOwnProperty(profile, "profileCompletion")) {
    payload.profile_completion = profile.profileCompletion ?? 0;
  }
  if (hasOwnProperty(profile, "favoriteListingIds")) {
    payload.favorite_listing_ids = profile.favoriteListingIds ?? [];
  }
  if (hasOwnProperty(profile, "favoriteRoommateIds")) {
    payload.favorite_roommate_ids = profile.favoriteRoommateIds ?? [];
  }
  if (hasOwnProperty(profile, "viewedListingIds")) {
    payload.viewed_listing_ids = profile.viewedListingIds ?? [];
  }
  if (hasOwnProperty(profile, "contactedListingIds")) {
    payload.contacted_listing_ids = profile.contactedListingIds ?? [];
  }

  return payload;
}

/**
 * Columns safe to expose on public browse surfaces (roommate cards, featured
 * rows). Excludes contacts (email/telegram/phone — revoked from the anon role
 * at the database, see supabase-migration-contact-privacy.sql) and the
 * viewer-private favorites/viewed/contacted arrays. `select("*")` would be
 * rejected by PostgREST for anonymous visitors once those columns are revoked.
 * Also excludes contacts_hidden: cards never render contacts, and naming it
 * here would 42703 on databases where the contacts migration hasn't run yet.
 */
export const PUBLIC_PROFILE_COLUMNS = [
  "uid",
  "full_name",
  "age",
  "gender",
  "university",
  "occupation",
  "min_budget",
  "max_budget",
  "preferred_move_in_date",
  "lifestyle",
  "onboarding_complete",
  "looking_for_apartment",
  "photo_url",
  "bio",
  "role",
  "verified",
  "banned",
  "suspended",
  "profile_completion",
  "roommate_status",
  "featured",
  "featured_position",
  "created_at",
  "updated_at"
].join(", ");

export async function getProfileById(uid: string) {
  if (!isSupabaseConfigured) {
    return demoProfiles.find((profile) => profile.uid === uid) ?? null;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("uid", uid).maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function getRoommateProfiles(currentUid?: string | null) {
  if (!isSupabaseConfigured) {
    return sortNewest(
      demoProfiles.filter(
        (profile) =>
          profile.onboardingComplete && profile.lookingForApartment && profile.uid !== currentUid
      )
    );
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("onboarding_complete", true)
    .eq("looking_for_apartment", true)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) throw error;
  return (data ?? [])
    .map((row) => mapProfileRow(row as unknown as Record<string, unknown>))
    .filter((profile: UserProfile) => profile.uid !== currentUid);
}

/** Admin-curated roommates for the home page. Falls back to demo profiles when none are featured. */
export async function getFeaturedRoommates(limit = 6, client?: SupabaseClient) {
  if (!isSupabaseConfigured) {
    return demoProfiles.filter((profile) => profile.onboardingComplete && profile.lookingForApartment).slice(0, limit);
  }

  const supabase = client ?? getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("featured", true)
    .eq("banned", false)
    .eq("onboarding_complete", true)
    .eq("looking_for_apartment", true)
    .order("featured_position", { ascending: true })
    .limit(limit);

  // With Supabase configured, never substitute demo profiles: empty or failed
  // results return [] and the caller hides the section.
  if (error) {
    console.warn("Failed to load featured roommates", error);
    return [];
  }

  return (data ?? []).map((row) => mapProfileRow(row as unknown as Record<string, unknown>));
}

export async function upsertProfile(profile: Partial<UserProfile> & Pick<UserProfile, "uid">) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient();
  const payload = {
    ...toProfilePayload(profile),
    created_at: profile.createdAt?.toISOString() ?? new Date().toISOString()
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "uid" });
  if (error) throw error;
}

export async function updateProfile(profile: Partial<UserProfile> & Pick<UserProfile, "uid">) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").update(toProfilePayload(profile)).eq("uid", profile.uid);
  if (error) throw error;
}

// Legacy read-modify-write fallbacks — used only when the atomic RPCs
// (supabase-migration-atomic-mutations.sql) haven't been applied yet. They carry
// the original lost-update race and exist purely for backward compatibility.
async function toggleFavoriteListingLegacy(uid: string, listingId: string, active: boolean) {
  const profile = await getProfileById(uid);
  const nextFavorites = active
    ? (profile?.favoriteListingIds ?? []).filter((id) => id !== listingId)
    : [...new Set([...(profile?.favoriteListingIds ?? []), listingId])];
  await updateProfile({ uid, favoriteListingIds: nextFavorites });
}

async function toggleFavoriteRoommateLegacy(uid: string, roommateId: string, active: boolean) {
  const profile = await getProfileById(uid);
  const nextFavorites = active
    ? (profile?.favoriteRoommateIds ?? []).filter((id) => id !== roommateId)
    : [...new Set([...(profile?.favoriteRoommateIds ?? []), roommateId])];
  await updateProfile({ uid, favoriteRoommateIds: nextFavorites });
}

export async function toggleFavoriteListing(uid: string, listingId: string, active: boolean) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("toggle_favorite_listing", {
    p_listing_id: listingId,
    p_active: active
  });

  if (error) {
    if (isMissingRpc(error)) return toggleFavoriteListingLegacy(uid, listingId, active);
    throw error;
  }
}

export async function toggleFavoriteRoommate(uid: string, roommateId: string, active: boolean) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("toggle_favorite_roommate", {
    p_roommate_id: roommateId,
    p_active: active
  });

  if (error) {
    if (isMissingRpc(error)) return toggleFavoriteRoommateLegacy(uid, roommateId, active);
    throw error;
  }
}

async function appendUniqueProfileValue(
  uid: string,
  key: "viewedListingIds" | "contactedListingIds",
  value: string
) {
  if (!isSupabaseConfigured) return;

  const column = key === "viewedListingIds" ? "viewed_listing_ids" : "contacted_listing_ids";
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("record_recent_listing", {
    p_column: column,
    p_listing_id: value
  });

  if (!error) return;
  if (!isMissingRpc(error)) throw error;

  // Legacy fallback (racy): read-modify-write.
  const profile = await getProfileById(uid);
  const currentValues = profile?.[key] ?? [];
  const nextValues = [value, ...currentValues.filter((item) => item !== value)].slice(0, 24);
  await updateProfile({ uid, [key]: nextValues });
}

export async function recordViewedListing(uid: string, listingId: string) {
  await appendUniqueProfileValue(uid, "viewedListingIds", listingId);
}

export async function recordContactedListing(uid: string, listingId: string) {
  await appendUniqueProfileValue(uid, "contactedListingIds", listingId);
}
