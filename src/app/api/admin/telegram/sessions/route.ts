import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { listTelegramSessions, uploadTelegramSession } from "@/lib/data/telegram-admin";
import { requireAdminUser } from "@/lib/supabase/admin";
import { telegramSessionUploadSchema } from "@/lib/validations/telegram-admin.schema";

/**
 * The Telegram account the importer connects as.
 *
 * GET never returns the session string — `listTelegramSessions()` selects the
 * metadata columns explicitly. The credential goes in and is never read back
 * out to a browser.
 */
export async function GET() {
  try {
    await requireAdminUser();
    return NextResponse.json({ sessions: await listTelegramSessions() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdminUser();
    const input = telegramSessionUploadSchema.parse(await request.json());
    const session = await uploadTelegramSession({ ...input, createdBy: user.id });
    // The worker picks it up on its next reconnect and reports back what it
    // found, so `status` stays "unknown" until something has actually verified
    // the credential rather than claiming success on upload.
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
