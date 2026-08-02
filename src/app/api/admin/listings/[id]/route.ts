import { NextResponse } from "next/server";

import { revalidatePublic } from "@/lib/api/revalidate";
import { apiErrorResponse } from "@/lib/api/error-response";
import { deleteListingAdminMeta, upsertListingAdminMeta } from "@/lib/data/listing-admin-meta";
import { mapListingRow } from "@/lib/supabase/mappers";
import { requireAdminUser } from "@/lib/supabase/admin";
import { adminSourceSchema } from "@/lib/validations/admin-quick.schema";
import { listingUpdateSchema } from "@/lib/validations/admin.schema";
import { z } from "zod";

const listingAdminUpdateSchema = listingUpdateSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  archived: z.boolean().optional(),
  featured: z.boolean().optional(),
  featuredPosition: z.number().int().min(0).nullable().optional(),
  university: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  // Admin-only provenance; stored in the private settings row, never on the
  // listing row and never sent to a public page.
  adminMeta: adminSourceSchema.partial().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const input = listingAdminUpdateSchema.parse(await request.json());

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) payload.title = input.title;
    if (input.description !== undefined) payload.description = input.description;
    if (input.monthlyRent !== undefined) payload.monthly_rent = input.monthlyRent;
    if (input.city !== undefined) payload.city = input.city;
    if (input.district !== undefined) payload.district = input.district;
    if (input.address !== undefined) payload.address = input.address;
    if (input.university !== undefined) payload.university = input.university;
    if (input.lat !== undefined) payload.lat = input.lat;
    if (input.lng !== undefined) payload.lng = input.lng;
    if (input.status !== undefined) payload.status = input.status;
    if (input.archived !== undefined) payload.archived = input.archived;
    if (input.featured !== undefined) payload.featured = input.featured;
    if (input.featuredPosition !== undefined) payload.featured_position = input.featuredPosition;
    if (input.propertyType !== undefined) payload.property_type = input.propertyType;
    if (input.listingType !== undefined) payload.listing_type = input.listingType;
    if (input.depositRequired !== undefined) payload.deposit_required = input.depositRequired;
    if (input.depositAmount !== undefined) payload.deposit_amount = input.depositAmount;
    if (input.bedrooms !== undefined) payload.bedrooms = input.bedrooms;
    if (input.bathrooms !== undefined) payload.bathrooms = input.bathrooms;
    if (input.availableFrom) payload.available_from = new Date(input.availableFrom).toISOString();
    if (input.amenities !== undefined) payload.amenities = input.amenities;
    if (input.photoUrls !== undefined) payload.photo_urls = input.photoUrls;
    if (input.removed !== undefined) {
      payload.removed = input.removed;
      payload.removed_at = input.removed ? new Date().toISOString() : null;
    }
    if (input.ownerId !== undefined) payload.owner_id = input.ownerId;

    // `preferences` is a single jsonb column, so a partial edit has to be merged
    // into the stored object — writing only the changed key would silently drop
    // the other two.
    if (input.genderPreference !== undefined || input.smoking !== undefined || input.pets !== undefined) {
      const { data: current } = await supabase.from("listings").select("preferences").eq("id", id).maybeSingle();
      const existing = (current?.preferences ?? {}) as Record<string, string>;
      payload.preferences = {
        genderPreference: input.genderPreference ?? existing.genderPreference ?? "any",
        smoking: input.smoking ?? existing.smoking ?? "no",
        pets: input.pets ?? existing.pets ?? "no_pets"
      };
    }

    const { data, error } = await supabase.from("listings").update(payload).eq("id", id).select("*").single();
    if (error) throw error;

    if (input.adminMeta) await upsertListingAdminMeta(id, input.adminMeta);

    revalidatePublic("listings");

    return NextResponse.json({ listing: mapListingRow(data) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) throw error;

    // The metadata lives in a separate settings row with no foreign key, so it
    // has to be cleaned up explicitly or it outlives the listing it describes.
    await deleteListingAdminMeta(id);

    revalidatePublic("listings");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
