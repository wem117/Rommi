import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getUniversityCity, UNIVERSITIES } from "@/lib/constants/universities";
import { universityDisplayName, type PublicUniversity } from "@/lib/data/universities";
import { basicInfoSchema } from "@/lib/validations/profile.schema";
import { universityCreateSchema, universityUpdateSchema } from "@/lib/validations/university.schema";
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

describe("the admin panel can manage it", () => {
  const routeDir = join(process.cwd(), "src/app/api/admin/universities");
  const create = readFileSync(join(routeDir, "route.ts"), "utf8");
  const update = readFileSync(join(routeDir, "[id]/route.ts"), "utf8");

  const NEW_COLUMNS = ["name_ru", "name_kz", "country", "type", "website", "language"] as const;

  it("accepts every new field on create", () => {
    const parsed = universityCreateSchema.safeParse({
      name: CANONICAL,
      nameRu: "Кардиффский университет Казахстан",
      nameKz: CANONICAL,
      city: "Astana",
      country: "Kazakhstan",
      type: "International branch campus",
      website: "https://cardiff.edu.kz/",
      language: "English"
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.nameRu).toBe("Кардиффский университет Казахстан");
      expect(parsed.data.website).toBe("https://cardiff.edu.kz/");
    }
  });

  it("defaults country rather than leaving it blank", () => {
    const parsed = universityCreateSchema.parse({ name: "X" });
    expect(parsed.country).toBe("Kazakhstan");
  });

  it("rejects a website that is not a URL, and allows clearing it", () => {
    expect(universityCreateSchema.safeParse({ name: "X", website: "cardiff.edu.kz" }).success).toBe(false);
    expect(universityCreateSchema.safeParse({ name: "X", website: "" }).success).toBe(true);
  });

  it("edits one field at a time without defaulting the rest back", () => {
    // Zod 4's .partial() does NOT neutralise .default(), so an update schema
    // built that way silently rewrites every field the admin left alone. This
    // pins that only what was sent comes back.
    const parsed = universityUpdateSchema.parse({ language: "English" });
    expect(parsed).toEqual({ language: "English" });
    expect(parsed.country).toBeUndefined();
  });

  it("writes each new column on create — a field the route forgets is a field the form cannot save", () => {
    for (const column of NEW_COLUMNS) expect(create).toContain(column);
  });

  it("writes each new column on update", () => {
    for (const column of NEW_COLUMNS) expect(update).toContain(column);
  });

  it("exposes each new field in the admin form", () => {
    const form = readFileSync(join(process.cwd(), "src/app/admin/universities/page.tsx"), "utf8");
    for (const field of ["nameRu", "nameKz", "country", "type", "website", "language"]) {
      expect(form).toContain(`form.${field}`);
    }
    // The logo has its own uploader, not a bare text input.
    expect(form).toContain("form.logoUrl");
    expect(form).toContain("AdminImageUpload");
  });
});

/**
 * The other sixteen universities that carry the platform's traffic.
 *
 * Cardiff proved the mechanism; this proves the data behind it, which is the
 * part that rots. These assert against the migration file rather than a live
 * database so they fail in CI on a bad edit, not months later on a page nobody
 * checked.
 */
describe("the seeded university profiles", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20240101003500_university_profiles_and_cardiff_position.sql"),
    "utf8"
  );

  // slug -> the row's value tuple, parsed out of the VALUES list.
  const rows = [...sql.matchAll(/\n  \('([a-z0-9-]+)',\n((?:[^)]|\)(?!\s*,?\n))*)\)/g)].map(([, slug, body]) => ({
    slug,
    body
  }));

  const SLUGS = [
    "al-farabi-kazakh-national-university",
    "kbtu",
    "sdu-university",
    "satbayev-university",
    "kimep-university",
    "narxoz-university",
    "kazakh-ablai-khan-university-of-international-relations-and-world-languages",
    "nazarbayev-university",
    "kazakh-national-pedagogical-university-named-after-abai",
    "kazakh-national-medical-university",
    "l-n-gumilyov-eurasian-national-university",
    "astana-it-university",
    "turan-university",
    "international-it-university",
    "kazakh-national-agrarian-research-university",
    "s-seifullin-kazakh-agrotechnical-university",
    "astana-medical-university"
  ];

  it("covers all seventeen, exactly once each", () => {
    expect(rows.map((r) => r.slug).sort()).toEqual([...SLUGS].sort());
  });

  it("gives every one of them a website", () => {
    for (const row of rows) {
      expect(row.body, row.slug).toMatch(/'https:\/\/[^']+'/);
    }
  });

  it("gives every one of them a type and a language of instruction", () => {
    for (const row of rows) {
      expect(row.body, row.slug).toMatch(/'(National|Private|Public|Autonomous)[^']*university'/i);
      expect(row.body, row.slug).toMatch(/'(Kazakh|Russian|English)[^']*'/);
    }
  });

  it("uses abai.university, not the kaznpu.kz domain that now redirects away", () => {
    const abai = rows.find((r) => r.slug === "kazakh-national-pedagogical-university-named-after-abai");
    expect(abai?.body).toContain("https://abai.university/");
    // Only the stored values — the file's header comment names the dead domain
    // on purpose, to record why the stored one differs from the obvious guess.
    for (const row of rows) expect(row.body, row.slug).not.toContain("kaznpu.kz");
  });

  it("never rewrites `name`, the column everything else joins on", () => {
    // The single most destructive edit available in this file. `listings` and
    // `profiles` store the English name as free text; changing it here would
    // orphan every row already pointing at the old string.
    expect(sql).not.toMatch(/\bname\s*=\s*v\.name\b/);
    expect(sql).toMatch(/name_ru\s*=\s*v\.name_ru/);
  });

  it("leaves the admin's curation alone", () => {
    for (const column of ["active", "featured", "image_url", "listings_count_override"]) {
      expect(sql).not.toMatch(new RegExp(`\\n\\s+${column}\\s*=`));
    }
  });

  it("fills a missing logo without overwriting an uploaded one", () => {
    expect(sql).toContain("logo_url = coalesce(u.logo_url,");
  });

  it("puts Cardiff in 8th place, and guards the shift against re-running", () => {
    // position is 0-based, so 8th place is 7. Without the guard every redeploy
    // would push ten universities one slot further down the page.
    expect(sql).toContain("target constant int := 7");
    expect(sql).toContain("current_pos = target");
    expect(sql).toMatch(/return;/);
  });
});

describe("logo assets referenced by the migrations exist in the repo", () => {
  it("every /universities/*-logo.png path resolves to a real file", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    const sql = ["20240101003400_seed_cardiff_university_kazakhstan.sql", "20240101003500_university_profiles_and_cardiff_position.sql"]
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    const paths = [...new Set([...sql.matchAll(/'(\/universities\/[^']+)'/g)].map((m) => m[1]))];

    // A logo path that 404s renders an empty white plate on the card, which
    // looks like a bug rather than an absence.
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(existsSync(join(process.cwd(), "public", p)), p).toBe(true);
    }
  });
});
