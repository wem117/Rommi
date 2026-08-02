/**
 * Display helpers for profiles that may be only partially filled in.
 *
 * Listings and roommates imported through the Admin Panel come from Telegram,
 * WhatsApp and OLX posts, which state whatever the author happened to write.
 * The admin deliberately does not invent the rest, so `age`, `occupation` and
 * `university` are routinely absent — `admin-quick.schema.ts` defaults them to
 * `0` and `""` rather than forcing the admin to make something up.
 *
 * Rendering those raw produced strings like "0 · " and " · Almaty" on public
 * cards. These helpers keep an incomplete profile looking intentional instead
 * of broken.
 */

/**
 * True when a profile states a real age.
 *
 * `0` is the "not stated" sentinel, not someone's age. Treating it as a number
 * is what made imported roommates invisible behind the directory's age filter.
 */
export function hasStatedAge(age: number | null | undefined): boolean {
  return typeof age === "number" && Number.isFinite(age) && age > 0;
}

/**
 * Joins profile metadata with the app's " · " separator, dropping anything
 * missing — so an absent field collapses out of the line rather than leaving a
 * dangling separator.
 *
 *   joinMeta(["22", "Student"])  -> "22 · Student"
 *   joinMeta([null, "Student"])  -> "Student"
 *   joinMeta([null, ""])         -> ""
 */
export function joinMeta(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => (typeof part === "number" ? String(part) : part?.trim()))
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/**
 * The age segment of a metadata line: the number when stated, otherwise
 * nothing, so callers can pass it straight into `joinMeta`.
 */
export function ageSegment(age: number | null | undefined): string | null {
  return hasStatedAge(age) ? String(age) : null;
}

/**
 * Whether a profile passes an age-range filter.
 *
 * A profile with no stated age ALWAYS passes. An unknown value cannot be judged
 * against a range, and the roommate directory's inputs carry `min="18"`, so
 * excluding the "not stated" sentinel made imported profiles unreachable by any
 * combination of filters a visitor could set — saved, and permanently invisible.
 *
 * Extracted from the directory's filter callback so this rule is directly
 * testable; it is the exact condition that regressed.
 */
export function matchesAgeRange(
  age: number | null | undefined,
  minAge: number,
  maxAge: number
): boolean {
  if (!hasStatedAge(age)) return true;
  return (age as number) >= minAge && (age as number) <= maxAge;
}
