import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const ACCESS_COOKIE = "__session";
const REFRESH_COOKIE = "__refresh";
const EXPIRES_IN = 60 * 60 * 24 * 5;

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

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EXPIRES_IN,
    path: "/"
  });
  cookieStore.set(REFRESH_COOKIE, data.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EXPIRES_IN,
    path: "/"
  });

  return NextResponse.redirect(new URL(nextPath, origin));
}
