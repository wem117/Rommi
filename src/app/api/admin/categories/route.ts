import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { categoryCreateSchema } from "@/lib/validations/category.schema";
import { slugify } from "@/lib/validations/university.schema";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase
      .from("property_categories")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ categories: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const input = categoryCreateSchema.parse(await request.json());
    const slug = slugify(input.slug || input.name);

    const { data, error } = await supabase
      .from("property_categories")
      .insert({
        name: input.name,
        slug,
        icon: input.icon,
        position: input.position,
        active: input.active
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
