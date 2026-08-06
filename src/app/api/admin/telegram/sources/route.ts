import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { createTelegramSource, listTelegramSources } from "@/lib/data/telegram-admin";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramSourceSchema } from "@/lib/validations/telegram-admin.schema";

/** The channels the importer watches. Editable without a deploy — that is the point. */
export async function GET() {
  try {
    await requireAdminUser();
    return NextResponse.json({ sources: await listTelegramSources() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const input = telegramSourceSchema.parse(await request.json());
    return NextResponse.json({ source: await createTelegramSource(input) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
