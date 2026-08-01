import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/site-config";
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

  // Redirect targets MUST come from the configured public site URL, never from
  // `request.url`.
  //
  // This handler runs in the Node runtime of the standalone server, which sits
  // behind nginx/Cloudflare. There, `request.url` is reconstructed from the
  // server's own bind address (Dockerfile: HOSTNAME=0.0.0.0, PORT=3000) plus the
  // forwarded protocol — so `requestUrl.origin` evaluated to
  // `https://0.0.0.0:3000` in production. Every redirect out of this route
  // (OAuth sign-in AND the password-recovery link) therefore sent the browser to
  // an unroutable address; Safari reports "restricted network port".
  //
  // `siteConfig.url` is driven by NEXT_PUBLIC_SITE_URL (https://roomi.kz in
  // production, http://localhost:3000 in dev), so it is correct in both.
  // NOTE: middleware builds its redirects from `request.url` and is fine — it
  // runs in the edge runtime, which sees the real request host.
  const origin = siteConfig.url;

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
