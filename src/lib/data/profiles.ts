import { demoProfiles } from "@/lib/data/demo";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { UserProfile } from "@/types/user";

function sortNewest<T extends { createdAt: Date }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function toProfilePayload(profile: Partial<UserProfile>) {
  return {
    uid: profile.uid,
    email: profile.email ?? null,
    full_name: profile.fullName,
    age: profile.age,
    gender: profile.gender,
    university: profile.university,
    occupation: profile.occupation,
    min_budget: profile.minBudget,
    max_budget: profile.maxBudget,
    preferred_move_in_date: profile.preferredMoveInDate?.toISOString() ?? null,
    lifestyle: profile.lifestyle ?? null,
    onboarding_complete: profile.onboardingComplete,
    photo_url: profile.photoURL ?? null,
    bio: profile.bio ?? "",
    role: profile.role ?? "user",
    verified: profile.verified ?? false,
    profile_completion: profile.profileCompletion ?? 0,
    favorite_listing_ids: profile.favoriteListingIds ?? [],
    updated_at: new Date().toISOString()
  };
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
    return sortNewest(demoProfiles.filter((profile) => profile.onboardingComplete && profile.uid !== currentUid));
  }

  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_complete", true)
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
