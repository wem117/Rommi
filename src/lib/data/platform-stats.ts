import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface PlatformStats {
  listings: number;
  students: number;
  connections: number;
}

/**
 * Real counts for the home page hero stat row. Returns null when Supabase
 * isn't configured (or the query fails), so the caller can fall back to the
 * existing marketing copy rather than showing zeros.
 */
export async function getPlatformStats(): Promise<PlatformStats | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = getSupabaseBrowserClient();
    const [listings, students, conversations] = await Promise.all([
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("removed", false).eq("status", "approved"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("onboarding_complete", true),
      supabase.from("conversations").select("*", { count: "exact", head: true })
    ]);

    if (listings.error || students.error || conversations.error) return null;

    return {
      listings: listings.count ?? 0,
      students: students.count ?? 0,
      connections: conversations.count ?? 0
    };
  } catch {
    return null;
  }
}
