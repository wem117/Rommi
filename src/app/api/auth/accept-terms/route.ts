import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/supabase/session";

/**
 * Records the signed-in user's acceptance of the Terms of Service and Privacy
 * Policy.
 *
 * Security: the request body is ignored entirely. Both the timestamp and the
 * policy version are produced server-side, so a client cannot backdate an
 * acceptance or claim to have accepted a different version. The columns are
 * additionally locked down by the privileged-column guard trigger
 * (supabase/migrations/20240101001700_terms_acceptance.sql), which prevents a
 * user from writing them directly through PostgREST with their own JWT — this
 * route's service-role client is the only path that can set them.
 *
 * Idempotent: an existing acceptance of the current version is preserved so the
 * original timestamp is never overwritten by a later call.
 */
export async function POST() {
  try {
    const user = await requireSessionUser();

    // Cheap and idempotent, but still a write path: cap it so a signed-in
    // client cannot spin the database with repeated calls.
    if (!(await consume(`accept-terms:${user.id}`, 10, 60_000))) return rateLimitResponse();

    const supabase = createSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("uid, terms_accepted_at, terms_version")
      .eq("uid", user.id)
      .maybeSingle();

    if (existing?.terms_accepted_at && existing.terms_version === CURRENT_POLICY_VERSION) {
      return NextResponse.json({ ok: true, alreadyAccepted: true });
    }

    const acceptance = {
      terms_accepted_at: new Date().toISOString(),
      terms_version: CURRENT_POLICY_VERSION
    };

    // The profile row may not exist yet (it is created during onboarding), so
    // fall back to an insert when there is nothing to update.
    const { error } = existing
      ? await supabase.from("profiles").update(acceptance).eq("uid", user.id)
      : await supabase.from("profiles").insert({
          uid: user.id,
          email: user.email ?? null,
          ...acceptance
        });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
