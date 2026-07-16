import { NextResponse } from "next/server";
import { z } from "zod";

import { clientKey, consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";
import { friendlySupabaseError } from "@/lib/utils/errors";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    // This endpoint reveals whether an email is registered (needed for the
    // sign-in/up UX), which makes it an enumeration target. Throttle hard:
    // 10 lookups/minute per IP.
    if (!consume(clientKey(request, "email-status"), 10, 60_000)) {
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
    const normalizedEmail = email.trim().toLowerCase();

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
