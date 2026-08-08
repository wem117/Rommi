import { describe, expect, it } from "vitest";

import {
  applyListingFilters,
  buildListingQueryString,
  pageNumbers,
  parseListingFilters,
  parsePageParam,
  rangeFor,
  sanitiseSearch,
  totalPagesFor
} from "@/lib/data/listing-query";

describe("totalPagesFor", () => {
  it("matches the product examples", () => {
    // 14 listings -> one page; 16 -> two; 301 -> twenty-one.
    expect(totalPagesFor(14, 15)).toBe(1);
    expect(totalPagesFor(15, 15)).toBe(1);
    expect(totalPagesFor(16, 15)).toBe(2);
    expect(totalPagesFor(301, 15)).toBe(21);
  });

  it("has no pages when nothing matches", () => {
    expect(totalPagesFor(0, 15)).toBe(0);
  });
});

describe("rangeFor", () => {
  it("asks for exactly one page of rows", () => {
    expect(rangeFor(1, 15)).toEqual({ from: 0, to: 14 });
    expect(rangeFor(2, 15)).toEqual({ from: 15, to: 29 });
    expect(rangeFor(21, 15)).toEqual({ from: 300, to: 314 });
  });

  it("treats a nonsense page as the first", () => {
    expect(rangeFor(0, 15)).toEqual({ from: 0, to: 14 });
    expect(rangeFor(-5, 15)).toEqual({ from: 0, to: 14 });
  });
});

describe("parsePageParam", () => {
  it("accepts a real page number", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it("falls back to 1 for anything else", () => {
    for (const bad of [null, undefined, "", "0", "-2", "abc", "1.5", "1e3"]) {
      expect(parsePageParam(bad)).toBe(1);
    }
  });
});

describe("parseListingFilters", () => {
  it("reads a full query string", () => {
    const params = new URLSearchParams(
      "city=Almaty&listingType=private_room&propertyType=studio&minRent=50000&maxRent=200000&search=KBTU&sort=rent_asc"
    );
    expect(parseListingFilters(params)).toMatchObject({
      city: "Almaty",
      listingType: "private_room",
      propertyType: "studio",
      minRent: 50000,
      maxRent: 200000,
      search: "KBTU",
      sort: "rent_asc"
    });
  });

  it("drops values outside the allowed set instead of passing them to the database", () => {
    const params = new URLSearchParams("listingType=DROP TABLE&sort=random&minRent=-9&propertyType=castle");
    const filters = parseListingFilters(params);
    expect(filters.listingType).toBe("");
    expect(filters.propertyType).toBe("");
    expect(filters.minRent).toBe("");
    expect(filters.sort).toBe("newest");
  });
});

describe("buildListingQueryString", () => {
  it("round-trips filters through the URL", () => {
    const filters = { city: "Astana", maxRent: 150000, sort: "rent_desc" as const };
    const qs = buildListingQueryString(filters, 3);
    const parsed = parseListingFilters(new URLSearchParams(qs));
    expect(parsed).toMatchObject({ city: "Astana", maxRent: 150000, sort: "rent_desc" });
    expect(parsePageParam(new URLSearchParams(qs).get("page"))).toBe(3);
  });

  it("keeps the canonical first page clean", () => {
    // One address for one page of content: no ?page=1, no empty parameters.
    expect(buildListingQueryString({}, 1)).toBe("");
    expect(buildListingQueryString({ city: "", search: "  " }, 1)).toBe("");
    expect(buildListingQueryString({ sort: "newest" }, 1)).toBe("");
  });

  it("gives the same key for the same filters on any page", () => {
    // The browse client decides "did the user change a filter?" by comparing
    // these two strings. If the page number leaked into the comparison, landing
    // on page 2 would look like a filter change and bounce back to page 1.
    const filters = { city: "Almaty", maxRent: 200000, sort: "rent_asc" as const };
    expect(buildListingQueryString(filters, 1)).toBe(buildListingQueryString(filters, 1));
    // ...and a page-1 key never carries a page parameter to compare against.
    expect(buildListingQueryString(filters, 1)).not.toContain("page=");
  });

  it("preserves filters when only the page changes", () => {
    const filters = { city: "Almaty", listingType: "private_room" as const };
    expect(buildListingQueryString(filters, 2)).toContain("city=Almaty");
    expect(buildListingQueryString(filters, 2)).toContain("listingType=private_room");
    expect(buildListingQueryString(filters, 2)).toContain("page=2");
  });
});

describe("pageNumbers", () => {
  it("lists every page when they all fit", () => {
    expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("elides long runs but always keeps the first and last", () => {
    // 301 listings = 21 pages, viewed at page 11.
    expect(pageNumbers(11, 21)).toEqual([1, null, 10, 11, 12, null, 21]);
  });

  it("shows a lone skipped page rather than an ellipsis of the same width", () => {
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("stays inside the range at both ends", () => {
    expect(pageNumbers(1, 21)).toEqual([1, 2, null, 21]);
    expect(pageNumbers(21, 21)).toEqual([1, null, 20, 21]);
  });

  it("renders nothing when there is nothing to page through", () => {
    expect(pageNumbers(1, 0)).toEqual([]);
  });

  it("clamps a page beyond the end", () => {
    expect(pageNumbers(99, 3)).toEqual([1, 2, 3]);
  });
});

describe("sanitiseSearch", () => {
  it("strips the characters PostgREST uses as or() delimiters", () => {
    // Left in, these would break out of the or(...) clause.
    expect(sanitiseSearch("KBTU, (Almaty) 100%")).toBe("KBTU Almaty 100");
  });

  it("returns an empty string for nothing useful", () => {
    expect(sanitiseSearch(undefined)).toBe("");
    expect(sanitiseSearch("   ")).toBe("");
  });
});

/**
 * University filtering.
 *
 * The filter used to OR in "any listing with no university, in this
 * university's city". Because 37 of the Almaty listings carry no university at
 * all, selecting Al-Farabi, Turan, KBTU or Narxoz each returned the SAME 38
 * rows — one real match under 37 that matched only the city — and the single
 * genuine Turan listing sorted onto a later page, so tagging a listing looked
 * like it removed it from its own filter.
 */
describe("university filter", () => {
  function record() {
    const calls: Array<{ op: string; args: unknown[] }> = [];
    const q = {
      eq: (...args: unknown[]) => { calls.push({ op: "eq", args }); return q; },
      gte: (...args: unknown[]) => { calls.push({ op: "gte", args }); return q; },
      lte: (...args: unknown[]) => { calls.push({ op: "lte", args }); return q; },
      or: (...args: unknown[]) => { calls.push({ op: "or", args }); return q; },
      order: (...args: unknown[]) => { calls.push({ op: "order", args }); return q; }
    };
    return { q, calls };
  }

  it("matches the university column exactly", () => {
    const { q, calls } = record();
    applyListingFilters(q, { university: "Turan University" }, false);
    expect(calls).toContainEqual({ op: "eq", args: ["university", "Turan University"] });
  });

  it("never widens the filter to the university's city", () => {
    // The regression itself: any `or` mentioning city alongside university is
    // the old behaviour coming back.
    const { q, calls } = record();
    applyListingFilters(q, { university: "Al-Farabi Kazakh National University" }, false);
    const ors = calls.filter((c) => c.op === "or").map((c) => String(c.args[0]));
    for (const clause of ors) {
      expect(clause).not.toContain("city.eq");
      expect(clause).not.toContain("university.is.null");
    }
  });

  it("does not touch the university column when no university is selected", () => {
    const { q, calls } = record();
    applyListingFilters(q, {}, false);
    expect(calls.some((c) => c.op === "eq" && c.args[0] === "university")).toBe(false);
  });

  it("keeps city and university as independent filters", () => {
    const { q, calls } = record();
    applyListingFilters(q, { city: "Almaty", university: "KBTU" }, false);
    expect(calls).toContainEqual({ op: "eq", args: ["city", "Almaty"] });
    expect(calls).toContainEqual({ op: "eq", args: ["university", "KBTU"] });
  });
});
