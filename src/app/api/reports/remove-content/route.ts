import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";

const removeContentSchema = z.object({
  reportId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const { reportId } = removeContentSchema.parse(await request.json());

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("target_id, target_type")
      .eq("id", reportId)
      .single();
    if (reportError) throw reportError;

    if (report.target_type === "listing") {
      const { error } = await supabase
        .from("listings")
        .update({ removed: true, removed_at: new Date().toISOString() })
        .eq("id", report.target_id);
      if (error) throw error;
    } else if (report.target_type === "user") {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: true, banned_at: new Date().toISOString() })
        .eq("uid", report.target_id);
      if (error) throw error;
    }

    const { error: statusError } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", reportId);
    if (statusError) throw statusError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
