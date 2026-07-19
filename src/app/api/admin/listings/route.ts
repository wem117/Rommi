import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { createListing } from "@/lib/data/listings-admin";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapListingRow } from "@/lib/supabase/mappers";
import { listingSchema } from "@/lib/validations/listing.schema";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ listings: (data ?? []).map(mapListingRow) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Admin quick-create. Same field validation as the public create flow
// (listingSchema), written through the service-role client. `ownerId` is
// optional — defaults to the admin's own account.
const adminListingCreateSchema = listingSchema.and(
  z.object({ ownerId: z.string().trim().min(1).optional() })
);

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminUser();
    const input = adminListingCreateSchema.parse(await request.json());

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

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

