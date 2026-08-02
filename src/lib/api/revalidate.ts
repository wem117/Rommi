import { revalidatePath } from "next/cache";

/**
 * Invalidates the cached public pages that an admin mutation just made stale.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * ------------------------------
 * Two public pages are served from Next's ISR cache:
 *
 *     /            revalidate = 120   (featured listings/roommates, live counts)
 *     /roommates   revalidate = 120   (the roommate directory)
 *
 * Everything else public is `force-dynamic` and therefore always fresh.
 *
 * Nothing in the codebase invalidated that cache. An admin could create a
 * roommate, watch the API return 201, open the roommate search page, and not
 * find it — because the page being served was rendered before the row existed
 * and stayed valid for another two minutes. The record was genuinely saved, so
 * every database check said the system was fine; only the rendered page was
 * behind. Reloading "fixed" it, which made the whole thing look intermittent.
 *
 * It also explains why this was reported against roommate search specifically
 * and never against /rooms: /rooms is `force-dynamic`, so listings always
 * appeared instantly. The difference was never the write path — it was which
 * page happened to be cached.
 *
 * WHY SURFACES INSTEAD OF PATHS
 * -----------------------------
 * Callers name the KIND of data they changed, not the URLs to purge. Which page
 * renders featured roommates is a property of the pages, not of the admin route
 * that edited a profile, and route handlers should not have to track it. When a
 * page later starts (or stops) depending on something, this table changes once
 * rather than every call site drifting out of sync.
 */

/** A kind of record an admin can change, named after the data, not the page. */
export type PublicSurface =
  | "profiles"
  | "listings"
  | "testimonials"
  | "universities"
  | "settings";

/**
 * Which ISR-cached pages each kind of record appears on.
 *
 * Derived from `getHomepageData()` (settings, testimonials, universities,
 * featured listings, featured roommates, stat counts) and
 * `getRoommatesFirstPageServer()`. Only genuinely cached pages belong here:
 * listing a `force-dynamic` route would be busywork that implies a dependency
 * the cache does not actually hold.
 */
const SURFACE_PATHS: Record<PublicSurface, readonly string[]> = {
  // Featured roommates and the profile stat count on "/", plus the directory.
  profiles: ["/", "/roommates"],
  // Featured listings and the listing stat count. /rooms is force-dynamic.
  listings: ["/"],
  testimonials: ["/"],
  universities: ["/"],
  // homepage_hero / homepage_sections / featured limits.
  settings: ["/"]
};

/**
 * Purges the cached pages affected by the given surfaces.
 *
 * Deliberately never throws. It runs AFTER the write has been committed, so a
 * failure here means "the page is briefly stale", not "the mutation failed" —
 * turning that into a 500 would tell the admin their change was rejected when
 * it was actually saved, which is a worse and more confusing outcome than the
 * staleness this function exists to avoid.
 */
export function revalidatePublic(...surfaces: PublicSurface[]): void {
  const paths = new Set<string>();
  for (const surface of surfaces) {
    for (const path of SURFACE_PATHS[surface] ?? []) paths.add(path);
  }

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Next throws if called outside a request scope (and in some test
      // environments). The write already succeeded; the page self-heals on its
      // normal revalidate interval.
    }
  }
}

/** Exposed for tests: the exact page set a surface invalidates. */
export function pathsForSurfaces(...surfaces: PublicSurface[]): string[] {
  const paths = new Set<string>();
  for (const surface of surfaces) {
    for (const path of SURFACE_PATHS[surface] ?? []) paths.add(path);
  }
  return [...paths].sort();
}
