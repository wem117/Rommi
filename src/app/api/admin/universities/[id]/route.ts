import { NextResponse } from "next/server";

import { revalidatePublic } from "@/lib/api/revalidate";
import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import {
  isMissingOverrideColumnError,
  slugify,
  UNIVERSITY_OVERRIDE_COLUMNS,
  universityUpdateSchema
} from "@/lib/validations/university.schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const input = universityUpdateSchema.parse(await request.json());

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload.name = input.name;
    if (input.slug !== undefined && input.slug) payload.slug = slugify(input.slug);
    if (input.nameRu !== undefined) payload.name_ru = input.nameRu;
    if (input.nameKz !== undefined) payload.name_kz = input.nameKz;
    if (input.city !== undefined) payload.city = input.city;
    if (input.country !== undefined) payload.country = input.country;
    if (input.type !== undefined) payload.type = input.type;
    if (input.website !== undefined) payload.website = input.website;
    if (input.language !== undefined) payload.language = input.language;
    if (input.description !== undefined) payload.description = input.description;
    if (input.imageUrl !== undefined) payload.image_url = input.imageUrl || null;
    if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl || null;
    if (input.coverImageUrl !== undefined) payload.cover_image_url = input.coverImageUrl || null;
    if (input.position !== undefined) payload.position = input.position;
    if (input.active !== undefined) payload.active = input.active;
    if (input.featured !== undefined) payload.featured = input.featured;
    if (input.featuredPosition !== undefined) payload.featured_position = input.featuredPosition;
    if (input.listingsCountOverride !== undefined) payload.listings_count_override = input.listingsCountOverride;
    if (input.studentsCountOverride !== undefined) payload.students_count_override = input.studentsCountOverride;

    const runUpdate = (body: Record<string, unknown>) =>
      supabase.from("universities").update(body).eq("id", id).select("*").single();

    let { data, error } = await runUpdate(payload);
    if (error && isMissingOverrideColumnError(error)) {
      const stripped = { ...payload };
      for (const column of UNIVERSITY_OVERRIDE_COLUMNS) delete stripped[column];
      ({ data, error } = await runUpdate(stripped));
    }

    if (error) throw error;
    revalidatePublic("universities");
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
    revalidatePublic("universities");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
