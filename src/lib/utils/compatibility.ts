import type { LifestylePreferences, UserProfile } from "@/types/user";

const lifestyleKeys: Array<keyof LifestylePreferences> = [
  "smoking",
  "pets",
  "cleanliness",
  "sleepSchedule",
  "guests"
];

export function calculateCompatibilityScore(a?: UserProfile | null, b?: UserProfile | null) {
  if (!a?.lifestyle || !b?.lifestyle) return 0;

  const matches = lifestyleKeys.filter((key) => {
    const first = a.lifestyle[key];
    const second = b.lifestyle[key];
    return first === second || first === "no_preference" || second === "no_preference";
  }).length;

  return Math.round((matches / lifestyleKeys.length) * 100);
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
