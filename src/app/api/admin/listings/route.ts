import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapListingRow } from "@/lib/supabase/mappers";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ listings: (data ?? []).map(mapListingRow) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

