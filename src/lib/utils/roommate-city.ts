import { getUniversityCity } from "@/lib/constants/universities";
import type { UserProfile } from "@/types/user";

/**
 * The city a roommate is listed under.
 *
 * `profiles.city` was added late. Every roommate created before it is NULL, and
 * those rows previously depended entirely on deriving a city from the
 * university. Preferring the stored value and falling back to the derived one
 * means new profiles get an explicit city while existing ones behave exactly as
 * they did — which is the compatibility requirement.
 *
 * ALWAYS returns a city: `getUniversityCity` defaults to "Almaty" for an unknown
 * or empty university. That default is pre-existing behaviour and is deliberately
 * left alone here — changing it would silently move every legacy roommate whose
 * university is unrecognised, which is not what this change is for.
 */
export function roommateCity(profile: Pick<UserProfile, "city" | "university">): string {
  const stated = profile.city?.trim();
  if (stated) return stated;
  return getUniversityCity(profile.university);
}

/** Whether a roommate matches the selected city filter. */
export function matchesCity(
  profile: Pick<UserProfile, "city" | "university">,
  selectedCity: string,
  allCitiesValue: string
): boolean {
  if (selectedCity === allCitiesValue) return true;
  return roommateCity(profile) === selectedCity;
}

/** Distinct values, most-common first — dropdown order that puts the cities
 *  and universities with people in them at the top of the list. */
function byFrequency(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

/**
 * Which cities and universities are worth offering in the /roommates filter
 * dropdowns, derived from the profiles actually on the page rather than a
 * static list of every Kazakhstani city and every seeded university.
 *
 * `roommates` should be the full live set, not one page of it — the caller
 * seeds from SSR data and the roommates hook refetches up to 150 profiles, well
 * above the site's current total, so this is a census rather than a sample.
 * Cities go through `roommateCity`, the SAME derivation `matchesCity` filters
 * with (stored city, falling back to the university's city for legacy rows),
 * so the dropdown can never offer a value nothing on the page will match.
 */
export function deriveRoommateFilterInventory(
  roommates: readonly Pick<UserProfile, "city" | "university">[]
): { cities: string[]; universities: string[] } {
  return {
    cities: byFrequency(roommates.map((r) => roommateCity(r)).filter(Boolean)),
    universities: byFrequency(roommates.map((r) => r.university).filter((u): u is string => Boolean(u)))
  };
}
