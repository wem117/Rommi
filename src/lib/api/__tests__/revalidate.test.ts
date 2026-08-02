import { describe, expect, it, vi } from "vitest";

import { pathsForSurfaces, revalidatePublic } from "../revalidate";

/**
 * Regression cover for the admin-publishing bug: a roommate created through the
 * Admin Panel was saved correctly but did not appear on /roommates, because the
 * page is ISR-cached (revalidate = 120) and nothing invalidated it.
 *
 * The mapping below is the contract. If a cached page gains a dependency and
 * this table is not updated, these tests are what should fail.
 */
describe("pathsForSurfaces", () => {
  it("invalidates the roommate directory AND the homepage when a profile changes", () => {
    // The exact regression: /roommates lists profiles, and "/" renders featured
    // roommates plus a live profile count. Missing either leaves stale output.
    expect(pathsForSurfaces("profiles")).toEqual(["/", "/roommates"]);
  });

  it("invalidates only the homepage for listings, since /rooms is force-dynamic", () => {
    // /rooms renders fresh on every request, so listing it here would imply a
    // cache dependency that does not exist.
    expect(pathsForSurfaces("listings")).toEqual(["/"]);
  });

  it.each(["testimonials", "universities", "settings"] as const)(
    "invalidates the homepage for %s",
    (surface) => {
      expect(pathsForSurfaces(surface)).toEqual(["/"]);
    }
  );

  it("deduplicates when several surfaces share a page", () => {
    // A single mutation touching both must not purge "/" twice.
    expect(pathsForSurfaces("profiles", "listings", "settings")).toEqual(["/", "/roommates"]);
  });

  it("returns nothing for no surfaces", () => {
    expect(pathsForSurfaces()).toEqual([]);
  });

  it("never returns a path outside the two ISR-cached routes", () => {
    const cached = new Set(["/", "/roommates"]);
    const all = pathsForSurfaces("profiles", "listings", "testimonials", "universities", "settings");
    expect(all.every((p) => cached.has(p))).toBe(true);
  });
});

describe("revalidatePublic", () => {
  it("does not throw when called outside a request scope", () => {
    // It runs AFTER the write has committed. Throwing here would report a
    // successful mutation as a 500 — worse than the staleness it prevents.
    expect(() => revalidatePublic("profiles")).not.toThrow();
  });

  it("survives a failing revalidatePath", async () => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({
      revalidatePath: () => {
        throw new Error("called outside a request scope");
      }
    }));
    const { revalidatePublic: subject } = await import("../revalidate");
    expect(() => subject("profiles", "listings")).not.toThrow();
    vi.doUnmock("next/cache");
    vi.resetModules();
  });

  it("purges each affected path exactly once", async () => {
    vi.resetModules();
    const calls: string[] = [];
    vi.doMock("next/cache", () => ({
      revalidatePath: (p: string) => {
        calls.push(p);
      }
    }));
    const { revalidatePublic: subject } = await import("../revalidate");
    subject("profiles", "listings");
    expect(calls.sort()).toEqual(["/", "/roommates"]);
    vi.doUnmock("next/cache");
    vi.resetModules();
  });
});
