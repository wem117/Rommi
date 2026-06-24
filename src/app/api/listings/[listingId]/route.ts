import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { requireSessionUser } from "@/lib/firebase/session";
import { listingSchema } from "@/lib/validations/listing.schema";

interface RouteContext {
  params: Promise<{ listingId: string }>;
}

async function getOwnedListing(listingId: string, uid: string) {
  const listingRef = adminDb.collection("listings").doc(listingId);
  const snapshot = await listingRef.get();

  if (!snapshot.exists) {
    return { listingRef, status: 404 as const };
  }

  const data = snapshot.data() as { ownerId?: string };
  if (data.ownerId !== uid) {
    return { listingRef, status: 403 as const };
  }

  return { listingRef, status: 200 as const };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const decoded = await requireSessionUser();
    const { listingId } = await context.params;
    const ownership = await getOwnedListing(listingId, decoded.uid);

    if (ownership.status !== 200) {
      return NextResponse.json(
        { error: ownership.status === 404 ? "Listing not found" : "Forbidden" },
        { status: ownership.status }
      );
    }

    const input = listingSchema.parse(await request.json());
    await ownership.listingRef.update({
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
      updatedAt: FieldValue.serverTimestamp()
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
    const decoded = await requireSessionUser();
    const { listingId } = await context.params;
    const ownership = await getOwnedListing(listingId, decoded.uid);

    if (ownership.status !== 200) {
      return NextResponse.json(
        { error: ownership.status === 404 ? "Listing not found" : "Forbidden" },
        { status: ownership.status }
      );
    }

    await ownership.listingRef.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete listing failed", error);
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: "Could not delete listing" }, { status });
  }
}
