import { describe, expect, it } from "vitest";

import { LISTING_META_KEY_PREFIX } from "@/lib/data/listing-admin-meta";
import { newSeededHostUid } from "@/lib/data/seeded-hosts";
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
      owner_id: "a1b2c3d4-0000-4000-8000-000000000001",
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
    const seeded = Object.keys(mapListingRow(row({ owner_id: "a1b2c3d4-0000-4000-8000-000000000001" })) as object).sort();
    const organic = Object.keys(mapListingRow(row({ owner_id: "a1b2c3d4-0000-4000-8000-000000000002" })) as object).sort();
    expect(seeded).toEqual(organic);
  });

  it("gives a seeded host a uid that reads like any other account id", () => {
    // The owner uid travels in the listing payload and in the profile URL, so a
    // marker prefix ("roomi-admin-…") let any visitor read "admin" off a seeded
    // listing. It must stay a bare UUID, indistinguishable from an auth.users id.
    for (let i = 0; i < 20; i += 1) {
      const uid = newSeededHostUid();
      expect(uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(uid).not.toMatch(/admin|roomi|seed|staff/i);
    }
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
