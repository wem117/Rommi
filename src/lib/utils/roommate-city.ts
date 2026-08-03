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
