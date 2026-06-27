import { NextResponse } from "next/server";

import { deleteListing, updateListing } from "@/lib/data/listings-admin";
import { requireSessionUser } from "@/lib/supabase/session";
import { listingSchema } from "@/lib/validations/listing.schema";

interface RouteContext {
  params: Promise<{ listingId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { listingId } = await context.params;
    const input = listingSchema.parse(await request.json());

    await updateListing(listingId, user.id, {
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update listing failed", error);
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: "Could not update listing" }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { listingId } = await context.params;

    await deleteListing(listingId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete listing failed", error);
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: "Could not delete listing" }, { status });
  }
}
