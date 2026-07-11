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
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
  monthlyRent: number;
  depositRequired: boolean;
  depositAmount: number;
  city: string;
  district?: string;
  address: string;
  university: string;
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
