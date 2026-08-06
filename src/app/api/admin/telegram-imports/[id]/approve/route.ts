import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { revalidatePublic } from "@/lib/api/revalidate";
import { publishTelegramImport, TelegramPublishError } from "@/lib/data/telegram-publish";
import { updateTelegramImport } from "@/lib/data/telegram-imports";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramImportApproveSchema } from "@/lib/validations/telegram-import.schema";

/**
 * Approves a staged Telegram import.
 *
 * The creation itself lives in `publishTelegramImport()`, which the import
 * worker's automatic path also calls — one pipeline, two callers, so an
 * approved import and an automatically published one are the same record made
 * the same way. What this route adds is the things only a person can supply:
 * an admin identity for the audit trail, a map pin, and explicit confirmation
 * when the parser was unsure what kind of post it was reading.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdminUser();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { lat, lng, university } = telegramImportApproveSchema.parse(body);
    const ignoreDuplicates = z.boolean().optional().default(false).parse(body.ignoreDuplicates);
    // "I read the post; publish it as a property listing anyway." Only ever a
    // human decision, which is why the worker cannot set it.
    const confirmKindOverride = z.boolean().optional().default(false).parse(body.confirmKindOverride);

    // Persist the pin alongside the rest of the row before publishing, so the
    // audit trail — and a later re-open of this import — reflects exactly what
    // was published. Coordinates are optional: a listing with no pin is a
    // listing without a map, not an invalid one.
    if (lat != null && lng != null) {
      await updateTelegramImport(id, { lat, lng, status: "pending_review" });
    }

    const result = await publishTelegramImport(id, {
      reviewer: user.id,
      lat,
      lng,
      university,
      ignoreDuplicates,
      confirmKindOverride
    });

    revalidatePublic(result.kind === "roommate" ? "profiles" : "listings");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof TelegramPublishError) {
      return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
    }
    return apiErrorResponse(error);
  }
}
