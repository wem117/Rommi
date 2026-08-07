import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getUniversityCity, UNIVERSITIES } from "@/lib/constants/universities";
import { universityDisplayName, type PublicUniversity } from "@/lib/data/universities";
import { basicInfoSchema } from "@/lib/validations/profile.schema";
import {
  buildUniversityOptions,
  filterUniversityOptions,
  matchesUniversityFilter,
  plainUniversityOption
} from "@/lib/utils/university-options";

/**
 * Cardiff University Kazakhstan, end to end through every layer that is pure
 * enough to run here.
 *
 * It is the platform's first branch campus, and the first row whose name is
 * genuinely different in Russian, so it is the case that exercises the split
 * this test is really about: the name a user READS is localised, the name the
 * database STORES is not. Everything downstream — the city fallback, the
 * listings filter, the roommates filter, the Telegram parser — compares the
 * stored string, so if a translated name ever reached the database it would
 * create a second Cardiff that shares nothing with the first.
 */

const CANONICAL = "Cardiff University Kazakhstan";

const CARDIFF: PublicUniversity = {
  id: "cardiff",
  name: CANONICAL,
  names: { en: CANONICAL, ru: "Кардиффский университет Казахстан", kz: CANONICAL },
  slug: "cardiff-university-kazakhstan",
  city: "Astana",
  country: "Kazakhstan",
  type: "International branch campus",
  website: "https://cardiff.edu.kz/",
  language: "English",
  description: "Cardiff University Kazakhstan is Cardiff University's branch campus in Astana, Kazakhstan.",
  imageUrl: "/universities/cardiff-university-kazakhstan.jpg",
  logoUrl: "/universities/cardiff-university-kazakhstan-logo.png"
};

const KBTU: PublicUniversity = {
  ...CARDIFF,
  id: "kbtu",
  name: "KBTU",
  names: { en: "KBTU", ru: "", kz: "" },
  slug: "kbtu",
  city: "Almaty",
  type: "",
  language: ""
};

describe("the university appears in search", () => {
  it("is on the built-in list every picker falls back to", () => {
    expect(UNIVERSITIES).toContain(CANONICAL);
  });

  it("is found by its English name", () => {
    const options = buildUniversityOptions([KBTU, CARDIFF], "en");
    expect(filterUniversityOptions(options, "cardiff", 8).map((o) => o.value)).toEqual([CANONICAL]);
  });

  it("is found by its Russian name, which is not a substring of the English one", () => {
    // The point of the haystack. "Кардифф" shares no characters with the stored
    // value, so a search over stored names alone returns nothing for a Russian
    // speaker — the university would be invisible to them.
    const options = buildUniversityOptions([KBTU, CARDIFF], "ru");
    expect(filterUniversityOptions(options, "Кардифф", 8).map((o) => o.value)).toEqual([CANONICAL]);
  });

  it("is found in Russian even while the interface is in English, and the reverse", () => {
    for (const locale of ["en", "ru", "kz"] as const) {
      const options = buildUniversityOptions([CARDIFF], locale);
      expect(filterUniversityOptions(options, "кардиффский", 8)).toHaveLength(1);
      expect(filterUniversityOptions(options, "CARDIFF", 8)).toHaveLength(1);
    }
  });

  it("reads in the visitor's language", () => {
    expect(universityDisplayName(CARDIFF, "ru")).toBe("Кардиффский университет Казахстан");
    expect(universityDisplayName(CARDIFF, "en")).toBe(CANONICAL);
    // Kazakh uses the Latin name, as it does for most branch campuses.
    expect(universityDisplayName(CARDIFF, "kz")).toBe(CANONICAL);
  });

  it("falls back to the canonical name rather than rendering blank", () => {
    expect(universityDisplayName(KBTU, "ru")).toBe("KBTU");
    expect(universityDisplayName(KBTU, "kz")).toBe("KBTU");
  });

  it("appears exactly once — no duplicate from the branch campus's parent brand", () => {
    const cardiffs = UNIVERSITIES.filter((name) => name.toLowerCase().includes("cardiff"));
    expect(cardiffs).toEqual([CANONICAL]);
    expect(new Set(UNIVERSITIES).size).toBe(UNIVERSITIES.length);
  });
});

describe("a user can select it", () => {
  it("commits the canonical English name whatever language they searched in", () => {
    // The invariant. Selecting from a Russian list must not store Russian.
    const [option] = filterUniversityOptions(buildUniversityOptions([CARDIFF], "ru"), "Кардифф", 8);
    expect(option.label).toBe("Кардиффский университет Казахстан");
    expect(option.value).toBe(CANONICAL);
  });

  it("keeps 'Other' selectable as the free-text escape hatch", () => {
    const options = [...buildUniversityOptions([CARDIFF], "en"), plainUniversityOption("Other")];
    expect(filterUniversityOptions(options, "oth", 8).map((o) => o.value)).toEqual(["Other"]);
  });

  it("resolves to Astana, so Astana listings with no university still surface", () => {
    // getUniversityCity drives the listings query's fallback branch: match the
    // university exactly, OR match its city when the listing named none.
    expect(getUniversityCity(CANONICAL)).toBe("Astana");
    expect(getUniversityCity("Cardiff University")).toBe("Astana");
    expect(getUniversityCity("cardiff")).toBe("Astana");
  });
});

describe("a profile saves correctly", () => {
  const base = {
    fullName: "Aliya S.",
    age: 20,
    gender: "female" as const,
    university: CANONICAL,
    city: "Astana",
    occupation: "Student"
  };

  it("accepts the university on a profile", () => {
    const parsed = basicInfoSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.university).toBe(CANONICAL);
  });

  it("stores the name unchanged — no trimming, casing or transliteration", () => {
    expect(basicInfoSchema.parse(base).university).toBe("Cardiff University Kazakhstan");
  });

  it("still rejects an empty university, so the field has not been loosened", () => {
    expect(basicInfoSchema.safeParse({ ...base, university: "" }).success).toBe(false);
  });

  it("is persisted by the profile writer rather than dropped from the payload", () => {
    // profiles.ts builds its update payload key by key; a field missing from
    // that list is silently discarded on save, which is exactly how a picker
    // can look like it works and store nothing.
    const src = readFileSync(join(process.cwd(), "src/lib/data/profiles.ts"), "utf8");
    expect(src).toContain('hasOwnProperty(profile, "university")');
    expect(src).toContain('payload.university = profile.university');
  });
});

describe("filters return the correct users", () => {
  const roommates = [
    { id: "a", university: CANONICAL },
    { id: "b", university: "Nazarbayev University" },
    { id: "c", university: "KBTU" },
    { id: "d", university: null }
  ];

  const filtered = (query: string) =>
    roommates.filter((r) => matchesUniversityFilter(r.university, query)).map((r) => r.id);

  it("returns only Cardiff students", () => {
    expect(filtered(CANONICAL)).toEqual(["a"]);
  });

  it("narrows as the name is typed rather than emptying the list", () => {
    expect(filtered("Cardiff")).toEqual(["a"]);
    expect(filtered("card")).toEqual(["a"]);
  });

  it("ignores case", () => {
    expect(filtered("cardiff university kazakhstan")).toEqual(["a"]);
  });

  it("returns everyone when the filter is cleared, including profiles with no university", () => {
    expect(filtered("")).toEqual(["a", "b", "c", "d"]);
    expect(filtered("   ")).toEqual(["a", "b", "c", "d"]);
  });

  it("does not match a profile that stored the Russian name", () => {
    // Not a wish: a proof that the canonical-value rule is load-bearing. If the
    // combobox ever commits a label, THIS is the breakage it produces.
    expect(matchesUniversityFilter("Кардиффский университет Казахстан", CANONICAL)).toBe(false);
  });
});

describe("the seed migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20240101003400_seed_cardiff_university_kazakhstan.sql"),
    "utf8"
  );

  it("carries every field the brief specified", () => {
    for (const value of [
      CANONICAL,
      "Кардиффский университет Казахстан",
      "cardiff-university-kazakhstan",
      "Astana",
      "Kazakhstan",
      "International branch campus",
      "https://cardiff.edu.kz/",
      "English"
    ]) {
      expect(sql).toContain(value);
    }
  });

  it("is idempotent, so a redeploy cannot duplicate the row", () => {
    expect(sql).toContain("on conflict (slug) do update");
  });

  it("does not overwrite the admin's curation on re-run", () => {
    // position/featured/active are the panel's; a redeploy must not undo them.
    const updateClause = sql.slice(sql.indexOf("on conflict"));
    expect(updateClause).not.toMatch(/\bposition\s*=/);
    expect(updateClause).not.toMatch(/\bfeatured\s*=/);
    expect(updateClause).not.toMatch(/\bactive\s*=/);
  });

  it("points at repo assets, not storage objects a fresh project would not have", () => {
    expect(sql).toContain("/universities/cardiff-university-kazakhstan.jpg");
    expect(sql).toContain("/universities/cardiff-university-kazakhstan-logo.png");
  });
});
