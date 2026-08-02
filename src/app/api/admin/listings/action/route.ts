import { NextResponse } from "next/server";

import { revalidatePublic } from "@/lib/api/revalidate";
import { apiErrorResponse } from "@/lib/api/error-response";
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
    revalidatePublic("listings");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Listing action failed", error);
    return apiErrorResponse(error);
  }
}
