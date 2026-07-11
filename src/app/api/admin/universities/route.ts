import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { slugify, universityCreateSchema } from "@/lib/validations/university.schema";

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

    const { data, error } = await supabase
      .from("universities")
      .insert({
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
        featured_position: input.featuredPosition ?? null
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ university: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
