import { getUniversityCity } from "@/lib/constants/universities";
import type { LifestylePreferences, UserProfile } from "@/types/user";

/**
 * Deterministic, weighted roommate compatibility.
 *
 * Weighted components (raw 0–100):
 *   - lifestyle & habits (smoking, pets, cleanliness, sleep, guests)  45
 *   - budget overlap                                                  25
 *   - university (same uni, or same city)                             15
 *   - move-in date proximity                                          10
 *   - age proximity                                                    5
 *
 * The raw total is mapped onto a 75–97 display range: matches ranked by the
 * same weighted signals, but the floor never dips below 75% — mirroring how
 * marketplaces like Roomies present match quality (encouraging, never
 * dismissive). No randomness: the same two profiles always score the same.
 */

// Ordered scales get partial credit for adjacent values.
const ORDERED_SCALES: Partial<Record<keyof LifestylePreferences, string[]>> = {
  cleanliness: ["relaxed", "moderate", "very_clean"],
  sleepSchedule: ["early_bird", "balanced", "night_owl"],
  guests: ["rarely", "sometimes", "often"]
};

const LIFESTYLE_KEYS: Array<keyof LifestylePreferences> = [
  "smoking",
  "pets",
  "cleanliness",
  "sleepSchedule",
  "guests"
];

function lifestyleAffinity(a: LifestylePreferences, b: LifestylePreferences): number {
  let total = 0;

  for (const key of LIFESTYLE_KEYS) {
    const first = a[key];
    const second = b[key];

    if (first === second || first === "no_preference" || second === "no_preference") {
      total += 1;
      continue;
    }

    const scale = ORDERED_SCALES[key];
    if (scale) {
      const distance = Math.abs(scale.indexOf(String(first)) - scale.indexOf(String(second)));
      if (distance === 1) total += 0.5;
    }
  }

  return total / LIFESTYLE_KEYS.length;
}

function budgetAffinity(a: UserProfile, b: UserProfile): number {
  const aMin = Math.min(a.minBudget || 0, a.maxBudget || 0);
  const aMax = Math.max(a.minBudget || 0, a.maxBudget || 0);
  const bMin = Math.min(b.minBudget || 0, b.maxBudget || 0);
  const bMax = Math.max(b.minBudget || 0, b.maxBudget || 0);

  if (aMax <= 0 || bMax <= 0) return 0.5; // unknown budgets: neutral

  const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  const smallerRange = Math.max(1, Math.min(aMax - aMin, bMax - bMin));
  if (overlap > 0) return Math.min(1, overlap / smallerRange);

  // No overlap: score by how far apart the ranges are, relative to budget size.
  const gap = Math.max(aMin, bMin) - Math.min(aMax, bMax);
  const scale = Math.max(aMax, bMax);
  return Math.max(0, 0.4 - gap / scale);
}

function universityAffinity(a: UserProfile, b: UserProfile): number {
  if (!a.university || !b.university) return 0.4; // unknown: mild neutral
  if (a.university === b.university) return 1;

  const cityA = getUniversityCity(a.university);
  const cityB = getUniversityCity(b.university);
  if (cityA && cityA === cityB) return 0.5;
  return 0;
}

function moveInAffinity(a: UserProfile, b: UserProfile): number {
  if (!a.preferredMoveInDate || !b.preferredMoveInDate) return 0.5; // flexible: neutral

  const days = Math.abs(a.preferredMoveInDate.getTime() - b.preferredMoveInDate.getTime()) / 86_400_000;
  if (days <= 14) return 1;
  if (days <= 45) return 0.6;
  if (days <= 90) return 0.3;
  return 0;
}

function ageAffinity(a: UserProfile, b: UserProfile): number {
  if (!a.age || !b.age) return 0.5;
  const gap = Math.abs(a.age - b.age);
  if (gap <= 2) return 1;
  if (gap <= 5) return 0.6;
  if (gap <= 10) return 0.3;
  return 0;
}

export function calculateCompatibilityScore(a?: UserProfile | null, b?: UserProfile | null) {
  if (!a?.lifestyle || !b?.lifestyle) return 0;

  const raw =
    lifestyleAffinity(a.lifestyle, b.lifestyle) * 45 +
    budgetAffinity(a, b) * 25 +
    universityAffinity(a, b) * 15 +
    moveInAffinity(a, b) * 10 +
    ageAffinity(a, b) * 5;

  // Map raw 0–100 onto the 75–97 display band.
  return Math.min(97, Math.max(75, Math.round(75 + raw * 0.22)));
}

/** Tier label key for the score badge (i18n key under shared.*). */
export function compatibilityTierKey(score: number): string {
  if (score >= 90) return "shared.excellentMatch";
  if (score >= 82) return "shared.greatMatch";
  return "shared.goodMatch";
}

export function profileCompletion(profile?: UserProfile | null) {
  if (!profile) return 0;

  const fields = [
    profile.fullName,
    profile.email,
    profile.age,
    profile.gender,
    profile.university,
    profile.occupation,
    profile.minBudget,
    profile.maxBudget,
    profile.preferredMoveInDate,
    profile.lifestyle,
    profile.bio,
    profile.photoURL
  ];

  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
