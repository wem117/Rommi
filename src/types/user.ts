export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type SmokingPreference = "no" | "yes" | "outside" | "no_preference";
export type PetsPreference = "no_pets" | "pet_friendly" | "has_pets" | "no_preference";
export type CleanlinessPreference = "relaxed" | "moderate" | "very_clean";
export type SleepSchedule = "early_bird" | "balanced" | "night_owl";
export type GuestsPreference = "rarely" | "sometimes" | "often";

export interface LifestylePreferences {
  smoking: SmokingPreference;
  pets: PetsPreference;
  cleanliness: CleanlinessPreference;
  sleepSchedule: SleepSchedule;
  guests: GuestsPreference;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string;
  age: number;
  gender: Gender;
  university: string;
  occupation: string;
  minBudget: number;
  maxBudget: number;
  preferredMoveInDate: Date | null;
  lifestyle: LifestylePreferences;
  onboardingComplete: boolean;
  photoURL?: string | null;
  bio?: string;
  role?: "user" | "admin";
  verified?: boolean;
  profileCompletion?: number;
  favoriteListingIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}
