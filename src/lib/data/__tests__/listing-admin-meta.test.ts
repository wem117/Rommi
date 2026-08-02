import { describe, expect, it } from "vitest";

import { LISTING_META_KEY_PREFIX } from "@/lib/data/listing-admin-meta";
import { mapListingRow } from "@/lib/supabase/mappers";

/**
 * The load-bearing guarantee of the seeded-listing feature: a regular user must
 * not be able to tell an admin-entered listing from an organic one.
 *
 * Two things enforce that, and both are asserted here:
 *  1. the admin metadata is stored under a `site_settings` key that the table's
 *     SELECT policy does not whitelist, so neither anon nor an ordinary
 *     authenticated user can read it;
 *  2. the listing row itself carries no admin field, so the object the public
 *     pages receive is identical in shape whoever created it.
 */
describe("seeded listings are indistinguishable", () => {
  const ADMIN_ONLY_FIELDS = [
    "contactName",
    "contactPhone",
    "contactTelegram",
    "sourceUrl",
    "sourceNote",
    "adminNotes",
    "contact_name",
    "contact_phone",
    "contact_telegram",
    "source_url",
    "source_note",
    "admin_notes",
    "createdByAdmin",
    "isSeeded",
    "adminMeta"
  ];

  function row(over: Record<string, unknown> = {}) {
    return {
      id: "l1",
      owner_id: "roomi-admin-1234",
      title: "Room",
      description: "d",
      property_type: "apartment",
      listing_type: "private_room",
      monthly_rent: 100000,
      deposit_required: false,
      deposit_amount: 0,
      city: "Almaty",
      district: "",
      address: "a",
      bedrooms: 1,
      bathrooms: 1,
      available_from: "2026-01-01T00:00:00Z",
      amenities: [],
      preferences: {},
      photo_urls: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      ...over
    };
  }

  it("exposes no admin-only field on a mapped listing", () => {
    const mapped = mapListingRow(row()) as unknown as Record<string, unknown>;
    for (const field of ADMIN_ONLY_FIELDS) {
      expect(mapped, `mapped listing leaked "${field}"`).not.toHaveProperty(field);
    }
  });

  it("maps an admin-owned listing to the same shape as a user-owned one", () => {
    // Identical keys means a public page has nothing to branch on.
    const seeded = Object.keys(mapListingRow(row({ owner_id: "roomi-admin-1234" })) as object).sort();
    const organic = Object.keys(mapListingRow(row({ owner_id: "9f0b-real-user" })) as object).sort();
    expect(seeded).toEqual(organic);
  });

  it("stores metadata under a key the site_settings SELECT policy does not whitelist", () => {
    // Policy whitelist: homepage_hero, homepage_sections, maintenance_mode,
    // admin_emails. Anything else is service-role only.
    const WHITELISTED = ["homepage_hero", "homepage_sections", "maintenance_mode", "admin_emails"];
    const key = `${LISTING_META_KEY_PREFIX}some-listing-id`;
    expect(WHITELISTED).not.toContain(key);
    expect(key.startsWith("listing_meta:")).toBe(true);
  });
});
