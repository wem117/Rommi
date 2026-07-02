import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase-server";
import { mapReportRow } from "@/lib/supabase/mappers";
import type { Report, ReportTargetType } from "@/types/report";

export async function createReport({
  reporterId,
  targetId,
  targetType,
  reason,
  details
}: {
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  details?: string;
}) {
  if (!isSupabaseAdminConfigured) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_id: targetId,
    target_type: targetType,
    reason,
    details: details ?? "",
    status: "open"
  });

  if (error) throw error;
}

export async function getReports() {
  if (!isSupabaseAdminConfigured) return [] as Report[];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReportRow);
}
