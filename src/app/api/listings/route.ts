import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { requireSessionUser } from "@/lib/firebase/session";
import { listingSchema } from "@/lib/validations/listing.schema";

export async function POST(request: Request) {
  try {
    const decoded = await requireSessionUser();
    const input = listingSchema.parse(await request.json());
    const listingRef = adminDb.collection("listings").doc();
    const now = FieldValue.serverTimestamp();

    await listingRef.set({
      id: listingRef.id,
      ownerId: decoded.uid,
      title: input.title,
      description: input.description,
      propertyType: input.propertyType,
      listingType: input.listingType,
      monthlyRent: input.monthlyRent,
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
      photoUrls: input.photoUrls,
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({ id: listingRef.id }, { status: 201 });
  } catch (error) {
    console.error("Create listing failed", error);
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: "Could not create listing" }, { status });
  }
}
