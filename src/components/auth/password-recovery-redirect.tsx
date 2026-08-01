"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const RESET_PATH = "/reset-password";

/**
 * Safety net that sends a user who arrived from a password-recovery email to
 * /reset-password, even when the link did not land there.
 *
 * WHY THIS EXISTS
 * ---------------
 * GoTrue only honours a `redirect_to` that matches its allow list
 * (GOTRUE_URI_ALLOW_LIST, from ADDITIONAL_REDIRECT_URLS). If that entry is ever
 * missing, GoTrue does not error — it silently DISCARDS the requested target and
 * falls back to SITE_URL. The recovery link then lands on the site root still
 * carrying the credentials, e.g. `https://roomi.kz/#access_token=...&type=recovery`
 * (implicit) or `/?code=...` (PKCE), leaving the user on the home page with no
 * way to set a password — which surfaces as "this reset link is invalid or has
 * expired". This component makes the flow survive that misconfiguration.
 *
 * WHY IT IS A FULL NAVIGATION, NOT router.replace()
 * -------------------------------------------------
 * `router.replace("/reset-password")` is a client-side transition that REWRITES
 * the address bar — and the recovery credentials live in the URL fragment. The
 * fragment was therefore thrown away before /reset-password could read it, and
 * the tokens are unrecoverable once gone.
 *
 * That is not a theoretical race. The shared browser client runs
 * `flowType: "pkce"` (hardcoded by @supabase/ssr), and GoTrueClient rejects an
 * implicit callback URL outright under that flow:
 *     case 'implicit': if (this.flowType === 'pkce')
 *         throw new AuthPKCEGrantCodeExchangeError('Not a valid PKCE flow url.')
 * So for an implicit link, supabase-js never creates a session, never emits
 * PASSWORD_RECOVERY, and never clears the hash — the hash sniff below is the
 * only trigger, and it fires while the tokens are still the ONLY copy in
 * existence. Stripping them there is fatal.
 *
 * Carrying `search + hash` across a real browser navigation hands the untouched
 * URL to /reset-password, where `establishRecoverySession()` installs it with
 * setSession(). When supabase-js DID succeed on its own (same-browser PKCE), the
 * session is already persisted in cookies and survives the reload just as well.
 */
export function PasswordRecoveryRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    const goToReset = () => {
      if (cancelled) return;
      // Already there (or deeper): nothing to do — avoids a redirect loop.
      if (window.location.pathname.startsWith(RESET_PATH)) return;
      // Preserve the query string and fragment verbatim; they carry the
      // recovery credentials.
      window.location.replace(`${RESET_PATH}${window.location.search}${window.location.hash}`);
    };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") goToReset();
    });

    // Implicit links never reach the event above (see the flow-mismatch throw in
    // the doc comment), so the URL itself is the trigger.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (params.get("type") === "recovery" && params.get("access_token")) goToReset();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  return null;
}
