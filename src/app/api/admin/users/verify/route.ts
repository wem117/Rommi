import { NextResponse } from "next/server";

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
  } catch (error: any) {
    console.error("Admin verify failed", error);
    const status = error?.message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status });
  }
}
