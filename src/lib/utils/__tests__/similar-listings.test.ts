import { describe, expect, it } from "vitest";

import { rankSimilarListings } from "@/lib/utils/similar-listings";
import type { Listing } from "@/types/listing";

function listing(over: Partial<Listing>): Listing {
  return {
    id: "x",
    ownerId: "o",
    title: "t",
    description: "d",
    propertyType: "apartment",
    listingType: "private_room",
    monthlyRent: 100_000,
    depositRequired: false,
    depositAmount: 0,
    city: "Almaty",
    district: "Bostandyk",
    address: "a",
    bedrooms: 1,
    bathrooms: 1,
    availableFrom: new Date("2026-01-01"),
    amenities: [],
    preferences: { genderPreference: "any", smoking: "no", pets: "no_pets" },
    photoUrls: [],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...over
  } as unknown as Listing;
}

const current = listing({ id: "current" });

describe("rankSimilarListings", () => {
  it("never returns the listing being viewed", () => {
    const out = rankSimilarListings(current, [current, listing({ id: "a" })]);
    expect(out.map((l) => l.id)).toEqual(["a"]);
  });

  it("puts the same housing type and a comparable price first", () => {
    const out = rankSimilarListings(current, [
      listing({ id: "far", listingType: "entire_place", monthlyRent: 400_000, propertyType: "house" }),
      listing({ id: "near", listingType: "private_room", monthlyRent: 105_000, propertyType: "apartment" })
    ]);
    expect(out[0].id).toBe("near");
  });

  it("ranks a closer price above a distant one when type matches equally", () => {
    const out = rankSimilarListings(current, [
      listing({ id: "pricey", monthlyRent: 900_000 }),
      listing({ id: "close", monthlyRent: 110_000 })
    ]);
    expect(out[0].id).toBe("close");
  });

  it("still returns results when nothing matches well", () => {
    // A hard filter would empty the section on a young marketplace; a loosely
    // related suggestion is more useful than none.
    const out = rankSimilarListings(current, [
      listing({ id: "other", listingType: "entire_place", propertyType: "dorm", monthlyRent: 999_999, district: "Z" })
    ]);
    expect(out.map((l) => l.id)).toEqual(["other"]);
  });

  it("honours the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) => listing({ id: `l${i}` }));
    expect(rankSimilarListings(current, many)).toHaveLength(3);
    expect(rankSimilarListings(current, many, 5)).toHaveLength(5);
  });

  it("does not crash when the current listing has no rent", () => {
    const free = listing({ id: "current", monthlyRent: 0 });
    expect(() => rankSimilarListings(free, [listing({ id: "a" })])).not.toThrow();
  });
});
