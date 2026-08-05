import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { getTelegramImportById, markTelegramImportReviewed } from "@/lib/data/telegram-imports";
import { requireAdminUser } from "@/lib/supabase/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdminUser();
    const { id } = await params;

    const item = await getTelegramImportById(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (item.status === "published" || item.status === "rejected") {
      return NextResponse.json({ error: `This import was already ${item.status}.` }, { status: 409 });
    }

    await markTelegramImportReviewed(id, "rejected", user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
