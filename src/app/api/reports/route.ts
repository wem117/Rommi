import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { createReport, getReports } from "@/lib/data/reports";
import { requireAdminUser } from "@/lib/supabase/admin";
import { requireSessionUser } from "@/lib/supabase/session";
import { reportCreateSchema, reportUpdateSchema } from "@/lib/validations/admin.schema";

export async function GET() {
  try {
    await requireAdminUser();
    // Delegated rather than queried here: the same SELECT lived in both places
    // and had already drifted — this route used the cookie-scoped client while
    // getReports() uses service-role, so the two could return different rows
    // for the same admin.
    return NextResponse.json({ reports: await getReports() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();

    // Per-user throttle: 10 reports/minute stops spam loops while never
    // blocking legitimate moderation reports.
    if (!(await consume(`reports:${user.id}`, 10, 60_000))) return rateLimitResponse();

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
