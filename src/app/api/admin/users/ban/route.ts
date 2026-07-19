import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { banUserSchema } from "@/lib/validations/admin.schema";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const data = banUserSchema.parse(await request.json());

    const { error } = await supabase
      .from("profiles")
      .update({ banned: data.ban, banned_at: data.ban ? new Date().toISOString() : null })
      .eq("uid", data.userId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin ban failed", error);
    return apiErrorResponse(error);
  }
}
