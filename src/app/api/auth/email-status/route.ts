import { NextResponse } from "next/server";
import { z } from "zod";

import { clientKey, consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { friendlySupabaseError } from "@/lib/utils/errors";

const schema = z.object({
  email: z.string().email()
});

/**
 * Neutralises LIKE metacharacters in a value that reaches `.ilike()`.
 *
 * `_` is a LEGAL email character and a single-character LIKE wildcard, so the
 * unescaped lookup answered a broader question than the caller asked:
 * `a_b@example.com` also matched `axb@example.com`. On an endpoint whose entire
 * job is to report whether an address is registered, that turns one throttled
 * request into a multi-address probe — the 10/min limit bounds enumeration only
 * if one request means one address.
 *
 * Backslash first, or it would escape the escapes added after it.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[%_]/g, (ch) => `\\${ch}`);
}

export async function POST(request: Request) {
  try {
    // This endpoint reveals whether an email is registered (needed for the
    // sign-in/up UX), which makes it an enumeration target. Throttle hard:
    // 10 lookups/minute per IP.
    if (!(await consume(clientKey(request, "email-status"), 10, 60_000))) {
      return rateLimitResponse();
    }

    if (!isSupabaseAdminConfigured) {
      return NextResponse.json(
        { error: "Supabase admin credentials are missing from .env.local." },
        { status: 503 }
      );
    }

    const { email } = schema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const normalizedEmail = escapeLikePattern(email.trim().toLowerCase());

    const { data, error } = await supabase
      .from("profiles")
      .select("uid")
      .ilike("email", normalizedEmail)
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      exists: Boolean(data?.length)
    });
  } catch (error) {
    return NextResponse.json(
      { error: friendlySupabaseError(error, "Could not check that email right now.") },
      { status: 400 }
    );
  }
}
