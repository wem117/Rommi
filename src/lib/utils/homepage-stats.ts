/**
 * Homepage "trust" statistics.
 *
 * WHAT WAS WRONG
 * --------------
 * There were exactly three metrics, hardcoded by key (`listings`, `students`,
 * `matches`), with their labels written into the homepage component in three
 * languages and their values computed as "live database count + an admin
 * baseline". Two consequences, both reported as "the statistics cannot be
 * changed":
 *
 *  1. The admin typed a number and a DIFFERENT number appeared. Setting the
 *     listings baseline to 234 published 234 + however many listings existed.
 *     The field was labelled a baseline, but nobody reading a figure on a
 *     homepage thinks in baselines — they think "this is the number I set".
 *  2. Adding a fourth metric, or renaming one, meant editing three locale
 *     tables and a component. That is not something an operator can do.
 *
 * WHAT IT IS NOW
 * --------------
 * A LIST of metrics the admin owns outright. Each carries its own labels, its
 * own value, and how that value is produced:
 *
 *     manual   the number shown IS the number typed
 *     live     a real database count, plus an optional offset
 *
 * So a new statistic is a row, not a release; and "no hardcoded values" holds
 * in both directions — no key, no label and no figure is compiled in.
 *
 * The defaults below exist for one reason: a database with no `homepage_stats`
 * row must still render the homepage the site already had, rather than an empty
 * strip. They are the values this project already shipped.
 */

/** Where a metric's number comes from. */
export type StatSource = "manual" | "listings" | "students" | "matches";

export interface HomepageStatMetric {
  /** Stable id. Survives renaming the label. */
  key: string;
  /** Per-locale label. Missing locales fall back to `en`, then to the key. */
  labels: { en: string; ru: string; kz: string };
  source: StatSource;
  /**
   * For `manual`, the figure itself. For a live source, an offset ADDED to the
   * real count — 0 publishes the unmodified truth.
   */
  value: number;
  /** Rendered after the number: "+", "%", or nothing. */
  suffix: string;
  visible: boolean;
}

/** Live counts, keyed by the sources a metric may draw on. */
export interface HomepageStatCounts {
  listings: number;
  students: number;
  matches: number;
}

export interface HomepageStatsConfig {
  metrics: HomepageStatMetric[];
}

export interface ResolvedStat {
  key: string;
  label: string;
  value: number;
  suffix: string;
}

export const EMPTY_HOMEPAGE_STAT_COUNTS: HomepageStatCounts = {
  listings: 0,
  students: 0,
  matches: 0
};

/**
 * The three metrics the site already showed, expressed in the new shape.
 *
 * `source: "manual"` on purpose: these are the figures an admin set and expects
 * to see rendered verbatim. Switching one to a live source is a dropdown away,
 * and then the number moves with the data.
 */
export const DEFAULT_HOMEPAGE_STATS_CONFIG: HomepageStatsConfig = {
  metrics: [
    {
      key: "listings",
      labels: { en: "Verified Listings", ru: "Проверенные объявления", kz: "Тексерілген хабарландырулар" },
      source: "manual",
      value: 1250,
      suffix: "+",
      visible: true
    },
    {
      key: "students",
      labels: { en: "Active Students", ru: "Активные студенты", kz: "Белсенді студенттер" },
      source: "manual",
      value: 4875,
      suffix: "+",
      visible: true
    },
    {
      key: "matches",
      labels: { en: "Successful Matches", ru: "Успешные совпадения", kz: "Сәтті сәйкестіктер" },
      source: "manual",
      value: 2150,
      suffix: "+",
      visible: true
    }
  ]
};

function nonNegativeInt(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Reads a stored config, tolerating the shape that came before it.
 *
 * Production holds `{ listings: { base: 234 }, students: {...}, matches: {...} }`
 * plus retired growth fields. Migrating that at read time rather than with a
 * data migration means the homepage keeps rendering the operator's own numbers
 * through the deploy, and the first admin save writes the new shape.
 */
export function normalizeStatsConfig(raw: unknown): HomepageStatsConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_HOMEPAGE_STATS_CONFIG;

  const candidate = raw as Partial<HomepageStatsConfig> & Record<string, unknown>;

  if (Array.isArray(candidate.metrics)) {
    const metrics = candidate.metrics
      .filter((metric): metric is HomepageStatMetric => Boolean(metric) && typeof metric === "object")
      .map((metric, index) => ({
        key: String(metric.key || `metric-${index}`),
        labels: {
          en: String(metric.labels?.en ?? ""),
          ru: String(metric.labels?.ru ?? ""),
          kz: String(metric.labels?.kz ?? "")
        },
        source: (["manual", "listings", "students", "matches"] as StatSource[]).includes(metric.source)
          ? metric.source
          : "manual",
        value: nonNegativeInt(metric.value),
        suffix: String(metric.suffix ?? "").slice(0, 4),
        visible: metric.visible !== false
      }));
    return { metrics };
  }

  // The pre-list shape: three fixed keys, each `{ base }` added to a live count.
  const legacyKeys: { key: string; source: StatSource }[] = [
    { key: "listings", source: "listings" },
    { key: "students", source: "students" },
    { key: "matches", source: "matches" }
  ];
  const legacy: HomepageStatMetric[] = [];
  for (const { key, source } of legacyKeys) {
    const entry = candidate[key] as { base?: unknown } | undefined;
    if (!entry || typeof entry !== "object") continue;
    const template = DEFAULT_HOMEPAGE_STATS_CONFIG.metrics.find((m) => m.key === key);
    legacy.push({
      key,
      labels: template?.labels ?? { en: key, ru: key, kz: key },
      // The old figure was count + base, so `live` preserves what was on
      // screen. An admin who wants the number they typed switches it to
      // manual, which is now a visible choice rather than a hidden formula.
      source,
      value: nonNegativeInt(entry.base),
      suffix: "+",
      visible: true
    });
  }

  return legacy.length ? { metrics: legacy } : DEFAULT_HOMEPAGE_STATS_CONFIG;
}

/**
 * The figures to render, in configured order.
 *
 * A `manual` metric shows exactly what the admin typed — no arithmetic, which
 * is the fix for "I set 500 and it shows 538".
 */
export function resolveHomepageStats(
  config: HomepageStatsConfig,
  counts: HomepageStatCounts = EMPTY_HOMEPAGE_STAT_COUNTS,
  locale: "en" | "ru" | "kz" = "en"
): ResolvedStat[] {
  return (config?.metrics ?? [])
    .filter((metric) => metric.visible)
    .map((metric) => ({
      key: metric.key,
      label: metric.labels[locale] || metric.labels.en || metric.key,
      value:
        metric.source === "manual"
          ? nonNegativeInt(metric.value)
          : nonNegativeInt(counts[metric.source]) + nonNegativeInt(metric.value),
      suffix: metric.suffix
    }));
}
