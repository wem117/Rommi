import { describe, expect, it } from "vitest";

import { deriveRoommateFilterInventory, matchesCity, roommateCity } from "../roommate-city";

const ALL = "All Cities";
const p = (city: string, university = "") => ({ city, university });

describe("roommateCity", () => {
  it("prefers the stored city", () => {
    expect(roommateCity(p("Astana", "KBTU"))).toBe("Astana");
  });

  it("falls back to the university-derived city for legacy rows", () => {
    // profiles.city was added late; every earlier roommate has it empty.
    expect(roommateCity(p("", "KBTU"))).toBe("Almaty");
  });

  it("falls back to the pre-existing Almaty default when nothing is known", () => {
    // getUniversityCity defaults to Almaty for an unknown/empty university.
    // That predates this change and is deliberately preserved: altering it
    // would silently relocate every legacy roommate with an unrecognised
    // university.
    expect(roommateCity(p("", ""))).toBe("Almaty");
    expect(roommateCity(p("", "Unrecognised University"))).toBe("Almaty");
  });

  it("ignores whitespace-only stored values", () => {
    expect(roommateCity(p("   ", "KBTU"))).toBe("Almaty");
  });
});

describe("matchesCity", () => {
  it("matches on the stored city", () => {
    expect(matchesCity(p("Astana"), "Astana", ALL)).toBe(true);
    expect(matchesCity(p("Astana"), "Almaty", ALL)).toBe(false);
  });

  it("matches legacy rows via the university fallback", () => {
    expect(matchesCity(p("", "KBTU"), "Almaty", ALL)).toBe(true);
  });

  it("places legacy rows with no city under the existing default", () => {
    // Unchanged from before this column existed.
    expect(matchesCity(p("", ""), "Almaty", ALL)).toBe(true);
    expect(matchesCity(p("", ""), "Astana", ALL)).toBe(false);
  });

  it("passes everything when no city is selected", () => {
    expect(matchesCity(p("Astana"), ALL, ALL)).toBe(true);
    expect(matchesCity(p(""), ALL, ALL)).toBe(true);
  });
});


describe("deriveRoommateFilterInventory", () => {
  it("only offers cities and universities a real profile actually has", () => {
    const roommates = [p("Almaty", "KBTU"), p("Almaty", "SDU University"), p("Astana", "Nazarbayev University")];
    const { cities, universities } = deriveRoommateFilterInventory(roommates);
    expect(new Set(cities)).toEqual(new Set(["Almaty", "Astana"]));
    expect(new Set(universities)).toEqual(new Set(["KBTU", "SDU University", "Nazarbayev University"]));
  });

  it("orders by how many profiles carry each value", () => {
    const roommates = [p("Almaty", "KBTU"), p("Almaty", "KBTU"), p("Astana", "KBTU")];
    const { cities } = deriveRoommateFilterInventory(roommates);
    expect(cities[0]).toBe("Almaty");
  });

  it("derives a city for legacy rows via the same fallback matchesCity uses", () => {
    // A profile with no stored city must not be invisible to its own filter —
    // roommateCity() is the single definition both sides share.
    const roommates = [p("", "KBTU")];
    const { cities } = deriveRoommateFilterInventory(roommates);
    expect(cities).toEqual([roommateCity(p("", "KBTU"))]);
  });

  it("drops profiles with no university from the university list, not the whole profile", () => {
    const roommates = [p("Almaty", ""), p("Almaty", "KBTU")];
    const { cities, universities } = deriveRoommateFilterInventory(roommates);
    expect(cities).toEqual(["Almaty"]);
    expect(universities).toEqual(["KBTU"]);
  });

  it("returns empty inventories for an empty roster rather than throwing", () => {
    expect(deriveRoommateFilterInventory([])).toEqual({ cities: [], universities: [] });
  });
});
