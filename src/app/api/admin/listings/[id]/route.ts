import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { mapListingRow } from "@/lib/supabase/mappers";
import { requireAdminUser } from "@/lib/supabase/admin";
import { listingUpdateSchema } from "@/lib/validations/admin.schema";
import { z } from "zod";

const listingAdminUpdateSchema = listingUpdateSchema.extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  featured: z.boolean().optional(),
  featuredPosition: z.number().int().min(0).nullable().optional()
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
    if (input.status !== undefined) payload.status = input.status;
    if (input.featured !== undefined) payload.featured = input.featured;
    if (input.featuredPosition !== undefined) payload.featured_position = input.featuredPosition;

    const { data, error } = await supabase.from("listings").update(payload).eq("id", id).select("*").single();
    if (error) throw error;
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
