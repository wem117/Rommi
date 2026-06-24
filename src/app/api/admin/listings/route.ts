import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ listings: data ?? [] });
  } catch (error: any) {
    const status = error?.message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status });
  }
}

