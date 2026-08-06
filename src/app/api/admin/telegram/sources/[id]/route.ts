import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { deleteTelegramSource, updateTelegramSource } from "@/lib/data/telegram-admin";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramSourceUpdateSchema } from "@/lib/validations/telegram-admin.schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const input = telegramSourceUpdateSchema.parse(await request.json());
    return NextResponse.json({ source: await updateTelegramSource(id, input) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    await deleteTelegramSource(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
