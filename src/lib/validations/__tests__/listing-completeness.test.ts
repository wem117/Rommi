import { describe, expect, it } from "vitest";

import { listingSchema } from "@/lib/validations/listing.schema";

/**
 * The three rules that stop incomplete listings reaching the feed.
 *
 * Each of these was previously permitted and each produced a visible defect:
 * grey "Нет фото" placeholders filling the browse grid, "Price not specified"
 * on rooms whose owner simply skipped the field, and untagged listings that
 * made every university filter return the same rows.
 *
 * The IMPORT path does not go through this schema — it builds rows via
 * createListing() — so a Telegram post that genuinely states no price keeps
 * working. This is about what a person can submit through the form.
 */

const valid = {
  title: "Bright room near campus",
  description:
    "A bright room in a quiet flat, five minutes from the university. Furnished, with a desk and good internet.",
  propertyType: "apartment" as const,
  listingType: "private_room" as const,
  monthlyRent: 150000,
  depositRequired: false,
  depositAmount: 0,
  city: "Almaty",
  address: "",
  university: "KBTU",
  lat: 43.238,
  lng: 76.889,
  bedrooms: 1,
  bathrooms: 1,
  availableFrom: "2026-09-01",
  amenities: [],
  genderPreference: "any" as const,
  smoking: "no" as const,
  pets: "no_pets" as const,
  photoUrls: ["https://example.com/room.jpg"]
};

const err = (data: unknown, path: string) => {
  const r = listingSchema.safeParse(data);
  return r.success ? null : r.error.issues.find((i) => i.path.join(".") === path)?.message ?? null;
};

describe("the baseline fixture", () => {
  it("is actually valid, so a failure below means the rule fired", () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });
});

describe("photos are mandatory", () => {
  it("rejects a listing with no photos", () => {
    expect(err({ ...valid, photoUrls: [] }, "photoUrls")).toBe("Add at least one photo of the room");
  });

  it("accepts a single photo", () => {
    expect(listingSchema.safeParse({ ...valid, photoUrls: ["https://a.test/1.jpg"] }).success).toBe(true);
  });

  it("still rejects a non-URL", () => {
    expect(listingSchema.safeParse({ ...valid, photoUrls: ["not-a-url"] }).success).toBe(false);
  });
});

describe("university is mandatory", () => {
  it("rejects an empty university", () => {
    expect(err({ ...valid, university: "" }, "university")).toBe("Select the nearest university");
  });
});

describe("price must be a positive whole number", () => {
  it("rejects zero, which is what rendered as 'Price not specified'", () => {
    expect(err({ ...valid, monthlyRent: 0 }, "monthlyRent")).toBe("Enter the monthly rent");
  });

  it("rejects a negative rent", () => {
    expect(listingSchema.safeParse({ ...valid, monthlyRent: -1 }).success).toBe(false);
  });

  it("rejects a fractional rent", () => {
    expect(err({ ...valid, monthlyRent: 1500.5 }, "monthlyRent")).toBe("Rent must be a whole number");
  });

  it("accepts a normal rent", () => {
    expect(listingSchema.safeParse({ ...valid, monthlyRent: 1 }).success).toBe(true);
  });
});
