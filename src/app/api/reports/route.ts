import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { createReport } from "@/lib/data/reports";
import { requireAdminUser } from "@/lib/supabase/admin";
import { requireSessionUser } from "@/lib/supabase/session";
import { mapReportRow } from "@/lib/supabase/mappers";
import { reportCreateSchema, reportUpdateSchema } from "@/lib/validations/admin.schema";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reports: (data ?? []).map(mapReportRow) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();

    // Per-user throttle: 10 reports/minute stops spam loops while never
    // blocking legitimate moderation reports.
    if (!consume(`reports:${user.id}`, 10, 60_000)) return rateLimitResponse();

    const data = reportCreateSchema.parse(await request.json());

    await createReport({
      reporterId: user.id,
      targetId: data.targetId,
      targetType: data.targetType,
      reason: data.reason,
      details: data.details
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Create report failed", error);
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const data = reportUpdateSchema.parse(await request.json());

    const { error } = await supabase
      .from("reports")
      .update({ status: data.status, admin_note: data.note ?? null })
      .eq("id", data.reportId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update report failed", error);
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");
    if (!reportId) throw new Error("Missing report id");

    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
