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
