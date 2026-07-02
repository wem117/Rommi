import { demoProfiles } from "@/lib/data/demo";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  if (hasOwnProperty(profile, "role")) payload.role = profile.role ?? "user";
  if (hasOwnProperty(profile, "verified")) payload.verified = profile.verified ?? false;
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

export async function getProfileById(uid: string) {
  if (!isSupabaseConfigured) {
    return demoProfiles.find((profile) => profile.uid === uid) ?? null;
  }

  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase.from("profiles").select("*").eq("uid", uid).single();
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

  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_complete", true)
    .eq("looking_for_apartment", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map(mapProfileRow).filter((profile: UserProfile) => profile.uid !== currentUid);
}

export async function upsertProfile(profile: Partial<UserProfile> & Pick<UserProfile, "uid">) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient() as any;
  const payload = {
    ...toProfilePayload(profile),
    created_at: profile.createdAt?.toISOString() ?? new Date().toISOString()
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "uid" });
  if (error) throw error;
}

export async function updateProfile(profile: Partial<UserProfile> & Pick<UserProfile, "uid">) {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase.from("profiles").update(toProfilePayload(profile)).eq("uid", profile.uid);
  if (error) throw error;
}

export async function toggleFavoriteListing(uid: string, listingId: string, active: boolean) {
  if (!isSupabaseConfigured) return;

  const profile = await getProfileById(uid);
  const nextFavorites = active
    ? (profile?.favoriteListingIds ?? []).filter((id) => id !== listingId)
    : [...new Set([...(profile?.favoriteListingIds ?? []), listingId])];

  await updateProfile({ uid, favoriteListingIds: nextFavorites });
}

export async function toggleFavoriteRoommate(uid: string, roommateId: string, active: boolean) {
  if (!isSupabaseConfigured) return;

  const profile = await getProfileById(uid);
  const nextFavorites = active
    ? (profile?.favoriteRoommateIds ?? []).filter((id) => id !== roommateId)
    : [...new Set([...(profile?.favoriteRoommateIds ?? []), roommateId])];

  await updateProfile({ uid, favoriteRoommateIds: nextFavorites });
}

async function appendUniqueProfileValue(
  uid: string,
  key: "viewedListingIds" | "contactedListingIds",
  value: string
) {
  if (!isSupabaseConfigured) return;

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
