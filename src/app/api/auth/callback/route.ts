import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(nextPath: string | null) {
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }

  return "/rooms";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  if (!code) {
    const signInUrl = new URL("/sign-in", origin);
    signInUrl.searchParams.set("error", "missing_oauth_code");
    return NextResponse.redirect(signInUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    const signInUrl = new URL("/sign-in", origin);
    signInUrl.searchParams.set("error", "oauth_callback_failed");
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
