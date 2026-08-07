export type PropertyType = "apartment" | "house" | "dorm" | "studio";
export type ListingType = "private_room" | "shared_room" | "entire_place";
export type GenderPreference = "any" | "male" | "female";
export type SmokingRule = "no" | "yes";
export type PetsRule = "no_pets" | "allowed";

export interface ListingPreferences {
  genderPreference: GenderPreference;
  smoking: SmokingRule;
  pets: PetsRule;
}

export type ModerationStatus = "pending" | "approved" | "rejected";

export interface Listing {
  id: string;
  ownerId: string;
  /** Identity-verified status of the host, embedded from profiles. */
  ownerVerified?: boolean;
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
  /**
   * null when the price is not stated.
   *
   * NOT 0. A listing whose price nobody wrote down is a real listing with an
   * unknown price; rendering that as "0 ₸" is a wrong number rather than a
   * missing one, and it is indistinguishable from a genuine zero.
   */
  monthlyRent: number | null;
  depositRequired: boolean;
  depositAmount: number;
  city: string;
  district?: string;
  address: string;
  university: string;
  lat: number | null;
  lng: number | null;
  bedrooms: number;
  bathrooms: number;
  availableFrom: Date;
  amenities: string[];
  preferences: ListingPreferences;
  photoUrls: string[];
  status: ModerationStatus;
  removed: boolean;
  removedAt: Date | null;
  archived: boolean;
  featured: boolean;
  featuredPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
}
