import { NextResponse } from "next/server";

import { revalidatePublic } from "@/lib/api/revalidate";
import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import {
  isMissingOverrideColumnError,
  slugify,
  UNIVERSITY_OVERRIDE_COLUMNS,
  universityCreateSchema
} from "@/lib/validations/university.schema";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase
      .from("universities")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ universities: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const input = universityCreateSchema.parse(await request.json());
    const slug = slugify(input.slug || input.name);

    const payload: Record<string, unknown> = {
      name: input.name,
      slug,
      city: input.city,
      description: input.description,
      image_url: input.imageUrl || null,
      logo_url: input.logoUrl || null,
      cover_image_url: input.coverImageUrl || null,
      position: input.position,
      active: input.active,
      featured: input.featured,
      featured_position: input.featuredPosition ?? null,
      listings_count_override: input.listingsCountOverride ?? null,
      students_count_override: input.studentsCountOverride ?? null
    };

    const runInsert = (body: Record<string, unknown>) =>
      supabase.from("universities").insert(body).select("*").single();

    let { data, error } = await runInsert(payload);
    if (error && isMissingOverrideColumnError(error)) {
      const stripped = { ...payload };
      for (const column of UNIVERSITY_OVERRIDE_COLUMNS) delete stripped[column];
      ({ data, error } = await runInsert(stripped));
    }

    if (error) throw error;
    revalidatePublic("universities");
    return NextResponse.json({ university: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
