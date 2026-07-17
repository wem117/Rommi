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
  lookingForApartment: boolean;
  photoURL?: string | null;
  bio?: string;
  telegram?: string;
  phone?: string;
  contactsHidden?: boolean;
  // Admin role value is the ADMIN_ROLE constant (defense-in-depth, not "admin").
  role?: "user" | "TimaEra";
  verified?: boolean;
  banned?: boolean;
  bannedAt?: Date | null;
  suspended?: boolean;
  suspendedAt?: Date | null;
  profileCompletion?: number;
  favoriteListingIds?: string[];
  favoriteRoommateIds?: string[];
  viewedListingIds?: string[];
  contactedListingIds?: string[];
  roommateStatus?: "pending" | "approved" | "rejected";
  featured?: boolean;
  featuredPosition?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
