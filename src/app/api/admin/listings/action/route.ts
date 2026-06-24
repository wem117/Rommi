import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/supabase/admin";
import { listingActionSchema } from "@/lib/validations/admin.schema";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const data = listingActionSchema.parse(await request.json());

    const { error } = await supabase
      .from("listings")
      .update({
        removed: data.action === "remove",
        removed_at: data.action === "remove" ? new Date().toISOString() : null
      })
      .eq("id", data.listingId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Listing action failed", error);
    const status = error?.message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status });
  }
}
