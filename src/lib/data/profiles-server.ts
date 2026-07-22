import "server-only";

import { demoProfiles } from "@/lib/data/demo";
import { PUBLIC_PROFILE_COLUMNS } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server-client";
import type { UserProfile } from "@/types/user";

/**
 * Server-side public profile read for SSR + generateMetadata. Selects only the
 * PUBLIC_PROFILE_COLUMNS (never contacts — those are revoked from anon at the
 * database), so a server-rendered roommate page carries no private data. The
 * client component re-fetches with the visitor's session to reveal contacts to
 * signed-in users.
 */
export async function getPublicProfileByIdServer(uid: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) {
    return demoProfiles.find((profile) => profile.uid === uid) ?? null;
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("uid", uid)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfileRow(data as unknown as Record<string, unknown>);
}

/**
 * First page of publicly-listed roommates for SSR of /roommates. Mirrors
 * getRoommateProfiles() (public columns, onboarded + looking, newest) without the
 * current-user exclusion (the server has no session — the client refines).
 */
export async function getRoommatesFirstPageServer(limit = 60): Promise<UserProfile[]> {
  if (!isSupabaseConfigured) {
    return demoProfiles
      .filter((profile) => profile.onboardingComplete && profile.lookingForApartment)
      .slice(0, limit);
  }

  const supabase = createSupabasePublicServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("onboarding_complete", true)
    .eq("looking_for_apartment", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => mapProfileRow(row as unknown as Record<string, unknown>));
}
