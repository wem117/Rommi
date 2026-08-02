import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import {
  findPossibleDuplicates,
  getListingAdminMetaMap,
  upsertListingAdminMeta
} from "@/lib/data/listing-admin-meta";
import { createListing } from "@/lib/data/listings-admin";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapListingRow } from "@/lib/supabase/mappers";
import { listingSchema } from "@/lib/validations/listing.schema";

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

// Admin quick-create. Same field validation as the public create flow
// (listingSchema), written through the service-role client. `ownerId` is
// optional — defaults to the admin's own account.
const adminMetaSchema = z.object({
  contactName: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(60).optional(),
  contactTelegram: z.string().trim().max(120).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
  sourceNote: z.string().trim().max(500).optional(),
  adminNotes: z.string().trim().max(4000).optional()
});

const adminListingCreateSchema = listingSchema.and(
  z.object({
    ownerId: z.string().trim().min(1).optional(),
    // A draft is stored hidden (`removed`), reusing the existing visibility
    // switch the admin list already exposes as publish/unpublish. No new
    // listing state is invented, so nothing downstream has to learn about it.
    publish: z.boolean().optional(),
    // Set once the admin has seen the duplicate warning and chosen to continue.
    ignoreDuplicates: z.boolean().optional(),
    adminMeta: adminMetaSchema.optional()
  })
);

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAdminUser();
    const input = adminListingCreateSchema.parse(await request.json());

    // Seeding is copy-paste work across several chat apps, so the same flat is
    // easy to enter twice. Warn once, then let the admin proceed deliberately.
    if (!input.ignoreDuplicates) {
      const duplicates = await findPossibleDuplicates({
        city: input.city,
        address: input.address,
        sourceUrl: input.adminMeta?.sourceUrl
      });
      if (duplicates.length) {
        return NextResponse.json({ duplicates }, { status: 409 });
      }
    }

    const id = await createListing(input.ownerId ?? user.id, {
      title: input.title,
      description: input.description,
      propertyType: input.propertyType,
      listingType: input.listingType,
      monthlyRent: input.monthlyRent,
      depositRequired: input.depositRequired,
      depositAmount: input.depositAmount,
      city: input.city,
      district: input.district ?? "",
      address: input.address,
      university: input.university,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      availableFrom: new Date(input.availableFrom),
      amenities: input.amenities,
      preferences: {
        genderPreference: input.genderPreference,
        smoking: input.smoking,
        pets: input.pets
      },
      photoUrls: input.photoUrls
    });

    // Any non-empty internal field must persist or the request must fail; a
    // half-created listing is recoverable, silently lost contact details are not.
    if (input.adminMeta && Object.values(input.adminMeta).some((v) => String(v ?? "").trim())) {
      await upsertListingAdminMeta(id, input.adminMeta);
    }

    // Drafts are created hidden so they never appear in browse while the admin
    // is still filling in details; publishing is the existing visibility toggle.
    if (input.publish === false) {
      await supabase.from("listings").update({ removed: true }).eq("id", id);
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

