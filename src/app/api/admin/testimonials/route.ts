import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { mapTestimonialRow } from "@/lib/data/testimonials";
import { requireAdminUser } from "@/lib/supabase/admin";
import { testimonialCreateSchema } from "@/lib/validations/testimonial.schema";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("position", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ testimonials: (data ?? []).map(mapTestimonialRow) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const input = testimonialCreateSchema.parse(await request.json());

    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        name: input.name,
        role: input.role,
        quote: input.quote,
        image_url: input.imageUrl || null,
        badge: input.badge,
        position: input.position,
        active: input.active
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ testimonial: mapTestimonialRow(data) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
