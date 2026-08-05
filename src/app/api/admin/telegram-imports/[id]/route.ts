import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { getTelegramImportById, updateTelegramImport } from "@/lib/data/telegram-imports";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramImportUpdateSchema } from "@/lib/validations/telegram-import.schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const item = await getTelegramImportById(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ import: item });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const input = telegramImportUpdateSchema.parse(await request.json());
    const updated = await updateTelegramImport(id, input);
    return NextResponse.json({ import: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
