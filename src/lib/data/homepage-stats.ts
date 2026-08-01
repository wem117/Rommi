import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { EMPTY_HOMEPAGE_STAT_COUNTS, type HomepageStatCounts } from "@/lib/utils/homepage-stats";

/**
 * Live counts behind the homepage trust figures.
 *
 * Runs on the SERVER ONLY, with the service-role client, and returns three
 * integers. Three reasons that is the right tool rather than the anon client:
 *
 *  - the homepage is public, and RLS (correctly) forbids anonymous visitors from
 *    selecting `listings` or `conversations` at all, so an anon count would be
 *    zero for exactly the visitors these numbers are meant to persuade;
 *  - `head: true` with `count: exact` transfers no rows — only a count — so
 *    nothing row-level can leak even in principle;
 *  - it needs no new database object, so it works against the current schema
 *    with no migration to apply first.
 *
 * The homepage is an ISR route (`revalidate = 120`), so this executes at most
 * once per revalidation window for the whole site: not per visitor, never from
 * the browser, and with no client-side polling.
 *
 * Every count fails soft: the homepage must render even if Supabase is briefly
 * unreachable, so an error yields 0 for that metric and the admin baseline still
 * shows.
 */
export async function getHomepageStatCounts(): Promise<HomepageStatCounts> {
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    // Service-role key not configured (e.g. local dev without secrets).
    return EMPTY_HOMEPAGE_STAT_COUNTS;
  }

  async function safeCount(run: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
    try {
      const { count, error } = await run();
      if (error) throw error;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  const [listings, students, matches] = await Promise.all([
    // Only what a visitor could actually browse to.
    safeCount(() =>
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .or("removed.is.null,removed.eq.false")
        .or("archived.is.null,archived.eq.false")
    ),
    safeCount(() => supabase.from("profiles").select("*", { count: "exact", head: true })),
    // The closest real signal the schema carries for a successful introduction.
    safeCount(() => supabase.from("conversations").select("*", { count: "exact", head: true }))
  ]);

  return { listings, students, matches };
}
