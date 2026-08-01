/**
 * Homepage "trust" statistics.
 *
 * These used to be entirely synthetic: an admin-configured base plus a seeded
 * per-day increment, so the figures advanced on a curve that had nothing to do
 * with the platform. Adding a listing did not change them; only editing settings
 * did.
 *
 * They are now REAL counts from the database (see the `homepage_stats()`
 * function in supabase/migrations), plus an explicit per-metric baseline the
 * admin can set. The baseline is a deliberate, visible offset — not a growth
 * simulation — and the live count underneath it always moves with the data.
 * Setting every baseline to 0 shows the unmodified truth.
 */

export interface StatMetricConfig {
  /** Added to the live count. 0 shows the real number and nothing else. */
  base: number;
}

export interface HomepageStatsConfig {
  listings: StatMetricConfig;
  students: StatMetricConfig;
  matches: StatMetricConfig;
}

/** Live counts as returned by the `homepage_stats()` database function. */
export interface HomepageStatCounts {
  listings: number;
  students: number;
  matches: number;
}

export interface HomepageStats {
  listings: number;
  students: number;
  matches: number;
}

/**
 * Default baselines.
 *
 * These are the values this project already shipped as the base of the old
 * simulation — they are not new numbers. Production stores no `homepage_stats`
 * row, so without a non-zero default the displayed figure would fall from the
 * order of thousands to the literal live count overnight. Keeping them makes the
 * change continuous; the admin can lower them, or set every one to 0 to publish
 * the unmodified real counts.
 */
export const DEFAULT_HOMEPAGE_STATS_CONFIG: HomepageStatsConfig = {
  listings: { base: 1250 },
  students: { base: 4875 },
  matches: { base: 2150 }
};

export const EMPTY_HOMEPAGE_STAT_COUNTS: HomepageStatCounts = {
  listings: 0,
  students: 0,
  matches: 0
};

function nonNegativeInt(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Combines the live database counts with the admin baseline.
 *
 * Tolerant of a config still carrying the retired growth fields (`growthMin`,
 * `growthMax`, `startDate`): unknown keys are ignored and only `base` is read,
 * so a settings row written before this change keeps working untouched.
 */
export function computeHomepageStats(
  config: HomepageStatsConfig,
  counts: HomepageStatCounts = EMPTY_HOMEPAGE_STAT_COUNTS
): HomepageStats {
  return {
    listings: nonNegativeInt(counts.listings) + nonNegativeInt(config?.listings?.base),
    students: nonNegativeInt(counts.students) + nonNegativeInt(config?.students?.base),
    matches: nonNegativeInt(counts.matches) + nonNegativeInt(config?.matches?.base)
  };
}
