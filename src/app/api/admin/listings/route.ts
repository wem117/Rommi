import { NextResponse } from "next/server";

import { revalidatePublic } from "@/lib/api/revalidate";
import { apiErrorResponse } from "@/lib/api/error-response";
import {
  findPossibleDuplicates,
  getListingAdminMetaMap,
  upsertListingAdminMeta
} from "@/lib/data/listing-admin-meta";
import { createListing } from "@/lib/data/listings-admin";
import { createTemporaryHost } from "@/lib/data/seeded-hosts";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapListingRow } from "@/lib/supabase/mappers";
import { adminQuickListingSchema } from "@/lib/validations/admin-quick.schema";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    // Admin-only metadata is returned ONLY on this admin route. It is never
    // merged into the listing object the public pages consume.
    const meta = await getListingAdminMetaMap();
    return NextResponse.json({ listings: (data ?? []).map(mapListingRow), meta, metaAvailable: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * Admin quick-create.
 *
 * Validated with `adminQuickListingSchema`, not the public `listingSchema`: the
 * admin is re-typing someone else's Telegram post, so most fields are simply not
 * in the source and demanding them would only produce invented data. See that
 * schema for the reasoning.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAdminUser();
    const input = adminQuickListingSchema.parse(await request.json());

    // Seeding is copy-paste work across several chat apps, so the same flat is
    // easy to enter twice. Warn once, then let the admin proceed deliberately.
    if (!input.ignoreDuplicates) {
      const duplicates = await findPossibleDuplicates({
        city: input.city,
        address: input.address,
        sourceUrl: input.source?.sourceUrl
      });
      if (duplicates.length) {
        // Nothing was written — this is the duplicate-detection bail-out, so
        // there is no new state for a cached page to be missing.
        return NextResponse.json({ duplicates }, { status: 409 });
      }
    }

    // Who the listing belongs to, in order of preference:
    //  1. a new lightweight profile built from the contacts in the post;
    //  2. an existing profile the admin picked;
    //  3. the admin's own account — last resort, and the UI warns about it.
    const ownerId = input.host ? await createTemporaryHost(input.host) : (input.ownerId ?? user.id);

    const id = await createListing(ownerId, {
      title: input.title,
      description: input.description,
      propertyType: input.propertyType,
      listingType: input.listingType,
      monthlyRent: input.monthlyRent,
      depositRequired: input.depositRequired,
      depositAmount: input.depositAmount,
      city: input.city,
      district: input.district,
      address: input.address,
      university: input.university,
      lat: input.lat,
      lng: input.lng,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      // No move-in date in the post means "available now", which is what a
      // reader assumes anyway. The column is NOT NULL, so it needs a value.
      availableFrom: input.availableFrom ? new Date(input.availableFrom) : new Date(),
      amenities: input.amenities,
      preferences: {
        genderPreference: input.genderPreference,
        smoking: input.smoking,
        pets: input.pets
      },
      photoUrls: input.photoUrls
    });

    // Any non-empty internal field must persist or the request must fail; a
    // half-created listing is recoverable, silently lost provenance is not.
    if (input.source && Object.values(input.source).some((v) => String(v ?? "").trim())) {
      await upsertListingAdminMeta(id, input.source);
    }

    // Drafts are created hidden so they never appear in browse while the admin
    // is still filling in details; publishing is the existing visibility toggle.
    if (!input.publish) {
      await supabase.from("listings").update({ removed: true }).eq("id", id);
    }

    revalidatePublic("listings");

    return NextResponse.json({ id, ownerId }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
