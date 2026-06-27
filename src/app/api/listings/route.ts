import { NextResponse } from "next/server";

import { createListing } from "@/lib/data/listings-admin";
import { requireSessionUser } from "@/lib/supabase/session";
import { friendlySupabaseError } from "@/lib/utils/errors";
import { listingSchema } from "@/lib/validations/listing.schema";
import { isValidMonthlyRent } from "@/lib/validations/monthly-rent";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const input = listingSchema.parse(await request.json());

    if (!isValidMonthlyRent(input.monthlyRent)) {
      return NextResponse.json(
        { error: "Monthly rent must be between 0 and 10,000,000 KZT." },
        { status: 400 }
      );
    }

    const id = await createListing(user.id, {
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

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Create listing failed", error);
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json(
      { error: friendlySupabaseError(error, "Could not create listing") },
      { status }
    );
  }
}
