import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { slugify, universityUpdateSchema } from "@/lib/validations/university.schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const input = universityUpdateSchema.parse(await request.json());

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload.name = input.name;
    if (input.slug !== undefined && input.slug) payload.slug = slugify(input.slug);
    if (input.city !== undefined) payload.city = input.city;
    if (input.description !== undefined) payload.description = input.description;
    if (input.imageUrl !== undefined) payload.image_url = input.imageUrl || null;
    if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl || null;
    if (input.coverImageUrl !== undefined) payload.cover_image_url = input.coverImageUrl || null;
    if (input.position !== undefined) payload.position = input.position;
    if (input.active !== undefined) payload.active = input.active;
    if (input.featured !== undefined) payload.featured = input.featured;
    if (input.featuredPosition !== undefined) payload.featured_position = input.featuredPosition;

    const { data, error } = await supabase
      .from("universities")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ university: data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const { error } = await supabase.from("universities").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
