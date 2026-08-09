import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { pathsForSurfaces } from "@/lib/api/revalidate";

/**
 * Only two public pages are served from Next's ISR cache — "/" and "/roommates",
 * both at revalidate = 120. Everything else public is force-dynamic and always
 * fresh. So a mutation that changes what those two pages render, and does NOT
 * call revalidatePublic(), leaves stale content on screen for up to two minutes.
 *
 * That is how this class of bug arrives: not by anyone removing a call, but by a
 * new route being written without one. Two routes had already drifted:
 *
 *   reports/remove-content  — a moderation TAKEDOWN. It sets listings.removed
 *                             or profiles.suspended/banned, so reported content
 *                             stayed on cached public pages after being removed.
 *                             admin/users/ban reaches the same state and did
 *                             revalidate, so the behaviour depended on which
 *                             route the admin happened to use.
 *   listings/[listingId]    — owner edit/delete. my-listings/[id] does the same
 *                             job and did revalidate.
 *
 * This test pins the rule instead of the two instances.
 */
const API_ROOT = join(process.cwd(), "src", "app", "api");

/** Routes that mutate, but whose data provably never reaches an ISR page. */
const EXEMPT = new Set([
  "admin/categories/route.ts",
  "admin/categories/[id]/route.ts",
  "admin/telegram-imports/[id]/reject/route.ts",
  "admin/telegram-imports/[id]/route.ts",
  "admin/telegram/sessions/route.ts",
  "admin/telegram/sessions/[id]/route.ts",
  "admin/telegram/sources/route.ts",
  "admin/telegram/sources/[id]/route.ts",
  "auth/accept-terms/route.ts",
  "auth/email-status/route.ts",
  "reports/route.ts",
  "upload/route.ts"
]);

/** Tables whose rows are rendered by an ISR-cached page. */
const PUBLIC_TABLES = /from\("(listings|profiles|testimonials|universities|site_settings)"\)/;

function routeFiles(dir: string, prefix = ""): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full, `${prefix}${entry}/`);
    return entry === "route.ts" ? [`${prefix}${entry}`] : [];
  });
}

describe("ISR revalidation coverage", () => {
  const files = routeFiles(API_ROOT);

  it("finds the API routes", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("every mutating route touching a public table invalidates the cache", () => {
    const missing: string[] = [];

    for (const rel of files) {
      if (EXEMPT.has(rel)) continue;
      const src = readFileSync(join(API_ROOT, rel), "utf8");

      const mutates = /export async function (POST|PATCH|PUT|DELETE)/.test(src);
      const writes = /\.(update|insert|upsert|delete)\(/.test(src);
      if (!mutates || !writes || !PUBLIC_TABLES.test(src)) continue;

      if (!src.includes("revalidatePublic(")) missing.push(rel);
    }

    expect(missing, `mutating routes with no revalidatePublic(): ${missing.join(", ")}`).toEqual([]);
  });

  it("a moderation takedown purges the pages the content was on", () => {
    const src = readFileSync(join(API_ROOT, "reports/remove-content/route.ts"), "utf8");
    // Listing takedown and user ban land on different pages, so one blanket
    // surface would be wrong in one direction or the other.
    expect(src).toMatch(/revalidatePublic\(\s*report\.target_type === "listing" \? "listings" : "profiles"\s*\)/);
  });

  it("both ISR pages are reachable from the surfaces that feed them", () => {
    expect(pathsForSurfaces("profiles")).toEqual(["/", "/roommates"]);
    expect(pathsForSurfaces("listings")).toEqual(["/"]);
  });

  it("the exemption list cannot silently cover a route that no longer exists", () => {
    const stale = [...EXEMPT].filter((rel) => !files.includes(rel));
    expect(stale, `exempt routes that no longer exist: ${stale.join(", ")}`).toEqual([]);
  });
});
