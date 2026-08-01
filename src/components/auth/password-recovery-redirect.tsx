"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const RESET_PATH = "/reset-password";

/**
 * Sends a user who arrived from a password-recovery email to /reset-password.
 *
 * WHY THIS EXISTS
 * ---------------
 * GoTrue only honours a `redirect_to` that matches its allow list
 * (GOTRUE_URI_ALLOW_LIST, from ADDITIONAL_REDIRECT_URLS). When that list is
 * empty or stale, GoTrue silently DISCARDS the requested target and falls back
 * to SITE_URL. Verified against production: every candidate — including
 * `https://roomi.kz/reset-password` — came back as `redirect_to=https://roomi.kz`.
 *
 * The recovery link therefore lands on the site root carrying the session in the
 * URL, e.g. `https://roomi.kz#access_token=...&type=recovery` (implicit) or
 * `?code=...` (PKCE). The user was left on the home page with no way to set a
 * password, which surfaced as "this reset link is invalid or expired".
 *
 * The browser client runs with `detectSessionInUrl: true`, so supabase-js
 * consumes those URL credentials, establishes the session and emits
 * PASSWORD_RECOVERY. Reacting to that event routes the user to the reset form no
 * matter which path GoTrue dropped them on — so the flow works whether or not
 * the server-side allow list is ever corrected, and under both PKCE and implicit
 * flows.
 */
export function PasswordRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    const goToReset = () => {
      if (cancelled) return;
      // Already there (or deeper): nothing to do — avoids a redirect loop.
      if (window.location.pathname.startsWith(RESET_PATH)) return;
      router.replace(RESET_PATH);
    };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") goToReset();
    });

    // Fallback for the race where supabase-js consumed (and cleared) the hash
    // before this listener mounted: the marker is still readable on first paint.
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) goToReset();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  return null;
}
