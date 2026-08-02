import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { getPublicContactsMap } from "@/lib/data/public-contacts";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/mappers";

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (error) throw error;
    const users = (data ?? []).map(mapProfileRow);
    // WhatsApp/Instagram have no column, so the edit dialog would otherwise
    // open with them blank and silently clear them on save.
    const contacts = await getPublicContactsMap(users.map((u) => u.uid));
    return NextResponse.json({ users, contacts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

