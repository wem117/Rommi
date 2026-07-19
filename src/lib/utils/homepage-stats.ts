/**
 * Deterministic "trust" statistics for the home page.
 *
 * The admin configures a base value, a daily growth range, and a start date per
 * metric. From those we derive today's number DETERMINISTICALLY — the same for
 * every visitor and stable across refreshes (it only advances once per day),
 * never random-on-refresh. Each day's increment varies within [growthMin,
 * growthMax] via a seeded hash so the totals look organic rather than linear.
 */

export interface StatMetricConfig {
  base: number;
  growthMin: number;
  growthMax: number;
}

export interface HomepageStatsConfig {
  startDate: string; // YYYY-MM-DD
  listings: StatMetricConfig;
  students: StatMetricConfig;
  matches: StatMetricConfig;
}

export interface HomepageStats {
  listings: number;
  students: number;
  matches: number;
}

export const DEFAULT_HOMEPAGE_STATS_CONFIG: HomepageStatsConfig = {
  startDate: "2025-01-01",
  listings: { base: 1250, growthMin: 2, growthMax: 5 },
  students: { base: 4875, growthMin: 5, growthMax: 20 },
  matches: { base: 2150, growthMin: 1, growthMax: 4 }
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
// Bound the per-day summation; beyond this many days we extrapolate with the
// average growth so the calc stays O(1)-ish even years after the start date.
const MAX_ITER_DAYS = 4000;

// Small deterministic integer hash (splitmix-ish) for a given day + seed.
function seededIncrement(dayIndex: number, seed: number, min: number, max: number): number {
  const range = Math.max(0, Math.trunc(max) - Math.trunc(min)) + 1;
  let x = (Math.imul(dayIndex + 1, 2654435761) ^ seed) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  x = (x ^ (x >>> 16)) >>> 0;
  return Math.trunc(min) + (x % range);
}

function computeMetric(config: StatMetricConfig, days: number, seed: number): number {
  const base = Math.max(0, Math.trunc(config.base));
  const min = Math.max(0, Math.trunc(config.growthMin));
  const max = Math.max(min, Math.trunc(config.growthMax));
  if (days <= 0) return base;

  const iterDays = Math.min(days, MAX_ITER_DAYS);
  let total = base;
  for (let d = 0; d < iterDays; d += 1) {
    total += seededIncrement(d, seed, min, max);
  }
  if (days > MAX_ITER_DAYS) {
    const avg = (min + max) / 2;
    total += Math.round(avg * (days - MAX_ITER_DAYS));
  }
  return total;
}

/** Days elapsed from the configured start date to `now` (never negative). */
function daysElapsed(startDate: string, now: Date): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return 0;
  const diff = Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY);
  return Math.max(0, diff);
}

export function computeHomepageStats(config: HomepageStatsConfig, now: Date = new Date()): HomepageStats {
  const days = daysElapsed(config.startDate, now);
  return {
    listings: computeMetric(config.listings, days, 0x1a2b3c),
    students: computeMetric(config.students, days, 0x4d5e6f),
    matches: computeMetric(config.matches, days, 0x7a8b9c)
  };
}
