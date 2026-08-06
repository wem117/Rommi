import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { apiErrorResponse } from "@/lib/api/error-response";
import { revalidatePublic } from "@/lib/api/revalidate";
import { publishTelegramImport, TelegramPublishError } from "@/lib/data/telegram-publish";

/**
 * Service-to-service publish, called by the Telegram import worker when a draft
 * clears its gate.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * The worker is Python; creating a listing is TypeScript —
 * `createTemporaryHost()` + `createListing()` + duplicate detection + admin
 * meta + cache revalidation. Reimplementing that in the worker would give two
 * pipelines that drift, and the promise of the whole feature is that an
 * imported listing is indistinguishable from a hand-seeded one. So the worker
 * asks the app to do it, through the same function the Approve button calls.
 *
 * AUTHENTICATION
 * --------------
 * A shared secret, compared in constant time, and REQUIRED — a missing or
 * empty INTERNAL_API_SECRET refuses every request rather than allowing them.
 * This endpoint can publish to a public page, so failing open here would be a
 * hole big enough to drive the entire moderation model through.
 *
 * The route never reads a user session and never runs requireAdminUser(): it is
 * the service acting on its own behalf, and `reviewed_by` records that plainly
 * as `telegram-import-worker` so an audit can tell the two apart.
 */

export const dynamic = "force-dynamic";

const SERVICE_REVIEWER = "telegram-import-worker";

function secretMatches(provided: string | null): boolean {
  const expected = process.env.INTERNAL_API_SECRET ?? "";
  // An unset secret disables the endpoint outright. Deploying the worker
  // without configuring one should mean "no automatic publishing", never
  // "automatic publishing that anybody can trigger".
  if (!expected || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length; compare lengths first and always run the comparison.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!secretMatches(request.headers.get("x-internal-secret"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await publishTelegramImport(id, {
      reviewer: SERVICE_REVIEWER,
      automatic: true,
      // The worker never overrides the parser's own classification, and never
      // skips duplicate detection. Both are judgement calls, and judgement is
      // exactly what an unattended publish does not have.
      ignoreDuplicates: false,
      confirmKindOverride: false,
      university: typeof body.university === "string" ? body.university : undefined
    });

    revalidatePublic(result.kind === "roommate" ? "profiles" : "listings");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof TelegramPublishError) {
      // A refusal here is normal and expected — a duplicate, an incomplete
      // draft, an ambiguous post. The worker logs it and leaves the draft in
      // the review queue, which is the designed fallback.
      return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
    }
    return apiErrorResponse(error);
  }
}
