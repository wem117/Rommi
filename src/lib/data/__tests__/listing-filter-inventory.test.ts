import { describe, expect, it } from "vitest";

import { dedupeCounted, getListingFilterInventoryServer } from "@/lib/data/listings-server";

/**
 * The /rooms filter dropdowns used to list every seeded city and university —
 * 17 and 30 respectively — when live inventory covered 2 and 8. Picking any of
 * the other 22 universities was guaranteed to return an empty page, with
 * nothing in the dropdown itself to tell a visitor which ones would.
 */

describe("dedupeCounted", () => {
  it("returns each distinct value once", () => {
    expect(dedupeCounted(["Almaty", "Almaty", "Astana", "Almaty"]).sort()).toEqual(["Almaty", "Astana"]);
  });

  it("orders by frequency, most first", () => {
    expect(dedupeCounted(["A", "B", "B", "C", "C", "C"])).toEqual(["C", "B", "A"]);
  });

  it("returns nothing for an empty list", () => {
    expect(dedupeCounted([])).toEqual([]);
  });

  it("handles a single value", () => {
    expect(dedupeCounted(["Almaty"])).toEqual(["Almaty"]);
  });
});

describe("getListingFilterInventoryServer (demo/unconfigured path)", () => {
  it("returns only cities and universities that actually appear on a live listing", async () => {
    const { cities, universities } = await getListingFilterInventoryServer();

    // Not the static 17-city, 30-university constant lists — a real subset.
    expect(cities.length).toBeGreaterThan(0);
    expect(universities.length).toBeGreaterThan(0);
    expect(cities).toContain("Almaty");

    // Every entry must be a real, non-empty string — no blank/undefined slot
    // from a listing whose university was never set.
    for (const u of universities) expect(u.trim().length).toBeGreaterThan(0);
  });

  it("returns a real subset, not the 17-city static constant list", async () => {
    const { cities } = await getListingFilterInventoryServer();
    // Pinned to the constant this replaced (src/lib/constants/cities.ts) rather
    // than to the demo fixture's exact row count, so the test still means the
    // same thing if a demo listing is added or removed later.
    expect(cities.length).toBeLessThan(17);
  });
});
