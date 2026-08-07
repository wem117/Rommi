import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_HOMEPAGE_STATS_CONFIG,
  normalizeStatsConfig,
  resolveHomepageStats,
  type HomepageStatsConfig
} from "@/lib/utils/homepage-stats";

const COUNTS = { listings: 38, students: 412, matches: 91 };

function config(...metrics: HomepageStatsConfig["metrics"]): HomepageStatsConfig {
  return { metrics };
}

const manual = (over: Partial<HomepageStatsConfig["metrics"][number]> = {}) => ({
  key: "listings",
  labels: { en: "Verified Listings", ru: "Проверенные объявления", kz: "Тексерілген" },
  source: "manual" as const,
  value: 500,
  suffix: "+",
  visible: true,
  ...over
});

describe("resolveHomepageStats", () => {
  it("shows a manual figure exactly as it was typed", () => {
    // THE reported bug: an admin set 500 and the homepage published 538,
    // because the live count was silently added to it.
    const [stat] = resolveHomepageStats(config(manual()), COUNTS);
    expect(stat.value).toBe(500);
  });

  it("adds a live count only when the metric asks for one", () => {
    const [stat] = resolveHomepageStats(config(manual({ source: "listings", value: 500 })), COUNTS);
    expect(stat.value).toBe(538);
  });

  it("publishes the unmodified real count when the offset is zero", () => {
    const [stat] = resolveHomepageStats(config(manual({ source: "listings", value: 0 })), COUNTS);
    expect(stat.value).toBe(38);
  });

  it("renders the label for the requested locale", () => {
    expect(resolveHomepageStats(config(manual()), COUNTS, "ru")[0].label).toBe("Проверенные объявления");
    expect(resolveHomepageStats(config(manual()), COUNTS, "kz")[0].label).toBe("Тексерілген");
  });

  it("falls back to English, then to the key, rather than rendering blank", () => {
    const missing = manual({ labels: { en: "Listings", ru: "", kz: "" } });
    expect(resolveHomepageStats(config(missing), COUNTS, "kz")[0].label).toBe("Listings");

    const empty = manual({ labels: { en: "", ru: "", kz: "" }, key: "extra" });
    expect(resolveHomepageStats(config(empty), COUNTS, "en")[0].label).toBe("extra");
  });

  it("keeps the configured order", () => {
    const stats = resolveHomepageStats(
      config(manual({ key: "b" }), manual({ key: "a" }), manual({ key: "c" })),
      COUNTS
    );
    expect(stats.map((s) => s.key)).toEqual(["b", "a", "c"]);
  });

  it("omits hidden metrics", () => {
    const stats = resolveHomepageStats(config(manual({ key: "a" }), manual({ key: "b", visible: false })), COUNTS);
    expect(stats.map((s) => s.key)).toEqual(["a"]);
  });

  it("supports a statistic the code has never heard of", () => {
    // The point of the rewrite: a new figure is a row, not a release.
    const invented = manual({ key: "universities", labels: { en: "Universities", ru: "Вузы", kz: "ЖОО" }, value: 24 });
    const [stat] = resolveHomepageStats(config(invented), COUNTS);
    expect(stat).toMatchObject({ key: "universities", label: "Universities", value: 24 });
  });

  it("carries the suffix instead of assuming a plus", () => {
    expect(resolveHomepageStats(config(manual({ suffix: "%" })), COUNTS)[0].suffix).toBe("%");
    expect(resolveHomepageStats(config(manual({ suffix: "" })), COUNTS)[0].suffix).toBe("");
  });

  it("never renders a negative figure", () => {
    expect(resolveHomepageStats(config(manual({ value: -5 })), COUNTS)[0].value).toBe(0);
  });

  it("survives an empty configuration", () => {
    expect(resolveHomepageStats({ metrics: [] }, COUNTS)).toEqual([]);
  });
});

describe("normalizeStatsConfig", () => {
  it("reads the shape production currently stores", () => {
    // Verbatim from site_settings.homepage_stats, retired growth fields and all.
    const stored = {
      matches: { base: 454, growthMax: 4, growthMin: 1 },
      listings: { base: 234, growthMax: 5, growthMin: 2 },
      students: { base: 1243, growthMax: 20, growthMin: 5 },
      startDate: "2025-01-01"
    };
    const normalized = normalizeStatsConfig(stored);

    expect(normalized.metrics.map((m) => m.key)).toEqual(["listings", "students", "matches"]);
    // Preserved as live-plus-offset, so the homepage keeps showing the same
    // figures through the deploy rather than jumping.
    expect(normalized.metrics[0]).toMatchObject({ source: "listings", value: 234 });
    expect(resolveHomepageStats(normalized, COUNTS)[0].value).toBe(234 + 38);
  });

  it("passes the new shape through unchanged", () => {
    const stored = config(manual({ key: "x", value: 7 }));
    expect(normalizeStatsConfig(stored).metrics[0]).toMatchObject({ key: "x", value: 7 });
  });

  it("falls back to the shipped defaults for anything unrecognisable", () => {
    for (const junk of [null, undefined, 42, "nope", {}, { metrics: undefined }]) {
      expect(normalizeStatsConfig(junk).metrics.length).toBe(DEFAULT_HOMEPAGE_STATS_CONFIG.metrics.length);
    }
  });

  it("repairs a malformed metric rather than dropping the whole config", () => {
    const normalized = normalizeStatsConfig({
      metrics: [{ key: "ok", labels: { en: "Fine" }, source: "nonsense", value: "12", visible: true }]
    });
    expect(normalized.metrics[0]).toMatchObject({ key: "ok", source: "manual", value: 12 });
  });

  it("defaults an unspecified visibility to shown", () => {
    const normalized = normalizeStatsConfig({ metrics: [{ key: "a", labels: { en: "A" }, source: "manual", value: 1 }] });
    expect(normalized.metrics[0].visible).toBe(true);
  });
});

/**
 * The bug that made this whole system look broken for days.
 *
 * `homepage_stats` was missing from the public RLS policy, so the anon client
 * the homepage renders through could not see the row at all. Every layer above
 * the database worked — the admin saved correctly, the shape was right, the
 * resolver was right, revalidation fired — and the page still showed the
 * shipped defaults, because the data never arrived.
 *
 * This pins the two halves of the fix that live in code. The policy itself is
 * pinned by supabase/migrations/20240101003200 and verified against the running
 * database.
 */
describe("public read path", () => {
  it("asks for homepage_stats among the public keys", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/data/public-settings.ts"), "utf8");
    const selected = src.slice(src.indexOf('.in("key"'), src.indexOf('.in("key"') + 400);
    expect(selected).toContain("homepage_stats");
  });

  it("normalizes rather than spreading, so a legacy row cannot yield the defaults", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/data/public-settings.ts"), "utf8");
    expect(src).toContain("normalizeStatsConfig(byKey.get(\"homepage_stats\"))");
    // The spread was the latent half: it silently produced the default metrics
    // for any row without a `metrics` array.
    expect(src).not.toContain("...DEFAULT_HOMEPAGE_STATS_CONFIG,");
  });
});
