import { describe, expect, it } from "vitest";

import { listingSchema } from "../listing.schema";

/**
 * Location moved from an address STRING to a map PIN.
 *
 * Geocoding Kazakhstan through Nominatim was the unreliable step — no
 * residential complexes (ЖК), weak building coverage, no apartment-level
 * results — and the evidence was in the data: ZERO listings created under that
 * flow had coordinates stored. The pin makes coordinates exact by construction,
 * and the address becomes free text that is never validated against a geocoder.
 */
const base = {
  title: "Bright room near KBTU",
  description: "A room with a window and a door.",
  propertyType: "apartment" as const,
  listingType: "private_room" as const,
  monthlyRent: 150000,
  depositRequired: false,
  depositAmount: 0,
  city: "Almaty",
  university: "KBTU",
  bedrooms: 1,
  bathrooms: 1,
  availableFrom: "2026-09-01",
  amenities: [],
  genderPreference: "any" as const,
  smoking: "no" as const,
  pets: "no_pets" as const,
  photoUrls: []
};

describe("listing location", () => {
  it("accepts a listing with a pin and no address at all", () => {
    // The address is optional; the pin is what places the listing.
    const result = listingSchema.safeParse({ ...base, lat: 43.238949, lng: 76.889709 });
    expect(result.success).toBe(true);
  });

  it("rejects publishing without coordinates", () => {
    const result = listingSchema.safeParse({ ...base, lat: null, lng: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("lat"))).toBe(true);
    }
  });

  it("rejects a half-set coordinate pair", () => {
    // A latitude with no longitude is not a location.
    expect(listingSchema.safeParse({ ...base, lat: 43.2, lng: null }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, lat: null, lng: 76.8 }).success).toBe(false);
  });

  it("keeps free-text addresses exactly as entered", () => {
    // Previously these failed to geocode and could not be saved.
    for (const address of ["ЖК Ауэзов Сити, 3 подъезд", "напротив КБТУ", "дом у парка"]) {
      const result = listingSchema.safeParse({ ...base, address, lat: 43.2, lng: 76.8 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.address).toBe(address);
    }
  });

  it("still enforces coordinate bounds", () => {
    expect(listingSchema.safeParse({ ...base, lat: 91, lng: 76.8 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, lat: 43.2, lng: 181 }).success).toBe(false);
  });
});
