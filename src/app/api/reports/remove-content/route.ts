import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";

const moderateSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(["remove_content", "warn", "suspend", "ban"]).optional().default("remove_content")
});

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const { reportId, action } = moderateSchema.parse(await request.json());

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("target_id, target_type")
      .eq("id", reportId)
      .single();
    if (reportError) throw reportError;

    const now = new Date().toISOString();

    if (report.target_type === "listing") {
      const { error } = await supabase.from("listings").update({ removed: true, removed_at: now }).eq("id", report.target_id);
      if (error) throw error;
    } else if (report.target_type === "user") {
      if (action === "suspend") {
        const { error } = await supabase.from("profiles").update({ suspended: true, suspended_at: now }).eq("uid", report.target_id);
        if (error) throw error;
      } else if (action === "warn") {
        // No in-app notification system exists yet; a warning is recorded via
        // the report's admin_note so it's visible in the user's report history.
      } else {
        const { error } = await supabase.from("profiles").update({ banned: true, banned_at: now }).eq("uid", report.target_id);
        if (error) throw error;
      }
    }

    const note = action === "warn" ? "Warning issued to user." : undefined;
    const { error: statusError } = await supabase
      .from("reports")
      .update({ status: "resolved", ...(note ? { admin_note: note } : {}) })
      .eq("id", reportId);
    if (statusError) throw statusError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
