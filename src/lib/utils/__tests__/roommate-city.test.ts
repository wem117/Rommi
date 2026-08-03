import { describe, expect, it } from "vitest";

import { matchesCity, roommateCity } from "../roommate-city";

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
