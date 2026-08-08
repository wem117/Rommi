import { NextResponse } from "next/server";

import { revalidatePublic } from "@/lib/api/revalidate";
import { apiErrorResponse } from "@/lib/api/error-response";
import { mapTestimonialRow } from "@/lib/data/testimonials";
import { requireAdminUser } from "@/lib/supabase/admin";
import { testimonialUpdateSchema } from "@/lib/validations/testimonial.schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const input = testimonialUpdateSchema.parse(await request.json());

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload.name = input.name;
    if (input.role !== undefined) payload.role = input.role;
    if (input.quote !== undefined) payload.quote = input.quote;
    if (input.imageUrl !== undefined) payload.image_url = input.imageUrl || null;
    if (input.badge !== undefined) payload.badge = input.badge;
    if (input.rating !== undefined) payload.rating = input.rating;
    if (input.position !== undefined) payload.position = input.position;
    if (input.active !== undefined) payload.active = input.active;

    const { data, error } = await supabase
      .from("testimonials")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    revalidatePublic("testimonials");
    return NextResponse.json({ testimonial: mapTestimonialRow(data) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) throw error;
    revalidatePublic("testimonials");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
