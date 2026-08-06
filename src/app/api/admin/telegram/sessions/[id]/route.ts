import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { deleteTelegramSession, setTelegramSessionActive } from "@/lib/data/telegram-admin";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramSessionActionSchema } from "@/lib/validations/telegram-admin.schema";

/** Connect, disconnect or delete a stored session. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const { action } = telegramSessionActionSchema.parse(await request.json());

    if (action === "delete") {
      await deleteTelegramSession(id);
      return NextResponse.json({ ok: true, deleted: true });
    }

    await setTelegramSessionActive(id, action === "activate");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
