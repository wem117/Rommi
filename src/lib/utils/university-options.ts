import { universityDisplayName, type PublicUniversity } from "@/lib/data/universities";

import type { Locale } from "@/lib/i18n";

/**
 * The university picker's data, kept out of the component so it can be tested.
 *
 * The whole module exists to hold one invariant: **what a user reads and what
 * the database stores are not the same string.**
 *
 * `listings.university` and `profiles.university` are free text. Filters compare
 * them with `eq`/`includes`, `getUniversityCity()` maps them to a city, and the
 * Telegram parser resolves incoming posts to them. So the stored value has to be
 * one canonical spelling per university, and that spelling is the English name.
 * A Russian-speaking student who picked "Кардиффский университет Казахстан"
 * would create a second university that matches nothing the English one matches
 * — no shared listings, no shared roommates, no shared city fallback.
 *
 * The translation therefore lives entirely on the display side: it is shown, and
 * it is searchable, and it is never stored.
 */
export type UniversityOption = {
  /** Committed and stored. Always the canonical English name. */
  value: string;
  /** Shown to the user, in their locale. */
  label: string;
  /** Lowercased haystack of every name, so any language finds the row. */
  haystack: string;
};

export function buildUniversityOptions(
  universities: readonly PublicUniversity[],
  locale: Locale
): UniversityOption[] {
  return universities.map((university) => ({
    value: university.name,
    label: universityDisplayName(university, locale),
    haystack: [university.name, university.names?.ru, university.names?.kz]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  }));
}

/** A university with no translations: the built-in constant list, and "Other". */
export function plainUniversityOption(name: string): UniversityOption {
  return { value: name, label: name, haystack: name.toLowerCase() };
}

export function filterUniversityOptions(
  options: readonly UniversityOption[],
  query: string,
  max: number
): UniversityOption[] {
  const needle = query.trim().toLowerCase();
  return options.filter((option) => option.haystack.includes(needle)).slice(0, max);
}

/**
 * The /roommates university filter, shared with the page so the test exercises
 * the predicate that actually ships rather than a restatement of it.
 *
 * Substring, not equality: the filter is fed by the same combobox but the field
 * is editable, and a half-typed "Cardiff" should narrow the list rather than
 * empty it.
 */
export function matchesUniversityFilter(profileUniversity: string | null | undefined, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (profileUniversity ?? "").toLowerCase().includes(needle);
}
