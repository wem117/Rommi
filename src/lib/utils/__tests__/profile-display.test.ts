import { describe, expect, it } from "vitest";

import { ageSegment, hasStatedAge, joinMeta, matchesAgeRange } from "../profile-display";

/**
 * Regression cover for the Admin Panel publishing bug.
 *
 * `admin-quick.schema.ts` defaults `age` to 0, documented as "not stated",
 * because posts imported from Telegram/WhatsApp/OLX rarely mention an age and
 * the admin must not invent one. The roommate directory then compared that
 * sentinel against its age range (`0 >= 18` -> false) and, because the age
 * inputs carry min="18", no filter combination a visitor could set would ever
 * reveal those profiles. They were saved correctly and permanently invisible.
 */
describe("matchesAgeRange", () => {
  it("keeps a profile with no stated age visible under the DEFAULT 18-30 filter", () => {
    // The exact regression. Before the fix this returned false and the profile
    // vanished from the directory forever.
    expect(matchesAgeRange(0, 18, 30)).toBe(true);
  });

  it("keeps an unstated age visible under ANY range, since it cannot be judged", () => {
    expect(matchesAgeRange(0, 25, 27)).toBe(true);
    expect(matchesAgeRange(null, 18, 30)).toBe(true);
    expect(matchesAgeRange(undefined, 18, 30)).toBe(true);
  });

  it("still filters normally when an age IS stated", () => {
    expect(matchesAgeRange(22, 18, 30)).toBe(true);
    expect(matchesAgeRange(17, 18, 30)).toBe(false);
    expect(matchesAgeRange(31, 18, 30)).toBe(false);
  });

  it("treats the range as inclusive at both ends", () => {
    expect(matchesAgeRange(18, 18, 30)).toBe(true);
    expect(matchesAgeRange(30, 18, 30)).toBe(true);
  });
});

describe("hasStatedAge", () => {
  it("rejects the not-stated sentinel and non-values", () => {
    expect(hasStatedAge(0)).toBe(false);
    expect(hasStatedAge(null)).toBe(false);
    expect(hasStatedAge(undefined)).toBe(false);
    expect(hasStatedAge(Number.NaN)).toBe(false);
  });

  it("accepts a real age", () => {
    expect(hasStatedAge(18)).toBe(true);
    expect(hasStatedAge(1)).toBe(true);
  });
});

describe("joinMeta", () => {
  it("drops missing parts instead of leaving a dangling separator", () => {
    // Imported profiles routinely have an empty occupation/university, which
    // previously rendered as "0 · " or " · Almaty".
    expect(joinMeta(["22", "Student"])).toBe("22 · Student");
    expect(joinMeta([null, "Student"])).toBe("Student");
    expect(joinMeta(["KBTU", ""])).toBe("KBTU");
    expect(joinMeta([undefined, ""])).toBe("");
  });

  it("ignores whitespace-only values", () => {
    expect(joinMeta(["   ", "Student"])).toBe("Student");
  });

  it("accepts numbers", () => {
    expect(joinMeta([22, "Student"])).toBe("22 · Student");
  });
});

describe("ageSegment", () => {
  it("omits the segment when the age is not stated", () => {
    expect(ageSegment(0)).toBeNull();
    expect(ageSegment(null)).toBeNull();
  });

  it("renders a stated age", () => {
    expect(ageSegment(24)).toBe("24");
  });

  it("composes with joinMeta so an unstated age leaves no separator", () => {
    expect(joinMeta([ageSegment(0), "Student"])).toBe("Student");
    expect(joinMeta([ageSegment(24), "Student"])).toBe("24 · Student");
  });
});
