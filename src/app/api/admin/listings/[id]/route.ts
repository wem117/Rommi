import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { deleteListingAdminMeta, upsertListingAdminMeta } from "@/lib/data/listing-admin-meta";
import { mapListingRow } from "@/lib/supabase/mappers";
import { requireAdminUser } from "@/lib/supabase/admin";
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
  // Admin-only; stored in listing_admin_meta, never on the listing row.
  adminMeta: z
    .object({
      contactName: z.string().trim().max(200).optional(),
      contactPhone: z.string().trim().max(60).optional(),
      contactTelegram: z.string().trim().max(120).optional(),
      sourceUrl: z.string().trim().max(500).optional(),
      sourceNote: z.string().trim().max(500).optional(),
      adminNotes: z.string().trim().max(4000).optional()
    })
    .optional()
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

    const { data, error } = await supabase.from("listings").update(payload).eq("id", id).select("*").single();
    if (error) throw error;

    if (input.adminMeta) await upsertListingAdminMeta(id, input.adminMeta);

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
