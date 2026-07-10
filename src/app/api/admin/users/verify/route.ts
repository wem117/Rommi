import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { verifyUserSchema } from "@/lib/validations/admin.schema";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const data = verifyUserSchema.parse(await request.json());

    const { error } = await supabase
      .from("profiles")
      .update({ verified: data.verify, verified_at: data.verify ? new Date().toISOString() : null })
      .eq("uid", data.userId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin verify failed", error);
    return apiErrorResponse(error);
  }
}
