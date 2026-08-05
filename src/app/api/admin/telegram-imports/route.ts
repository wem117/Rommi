import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { getPendingTelegramImports } from "@/lib/data/telegram-imports";
import { requireAdminUser } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdminUser();
    const imports = await getPendingTelegramImports();
    return NextResponse.json({ imports });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
