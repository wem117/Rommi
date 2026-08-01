"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { readRecoveryCredentials } from "@/lib/supabase/recovery";

const RESET_PATH = "/reset-password";

/**
 * Safety net that sends a user who arrived from a password-recovery email to
 * /reset-password, even when the link did not land there.
 *
 * GoTrue only honours a `redirect_to` that matches its allow list
 * (GOTRUE_URI_ALLOW_LIST, from ADDITIONAL_REDIRECT_URLS). If that entry is ever
 * missing, GoTrue does not error — it silently discards the requested target and
 * falls back to SITE_URL, dropping the user on the site root with the credential
 * still in the URL and no way to set a password. This keeps the flow working
 * through that misconfiguration.
 *
 * It is a full navigation rather than router.replace() because a client-side
 * transition rewrites the address bar, and the credential lives in the URL.
 *
 * `type` MUST be checked: signup-confirmation and email-change links arrive in
 * an identical shape, and this component is mounted app-wide, so without the
 * guard confirming a new account would be diverted to "set a new password".
 */
export function PasswordRecoveryRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    // Already there (or deeper): nothing to do — avoids a redirect loop.
    if (window.location.pathname.startsWith(RESET_PATH)) return;

    const credentials = readRecoveryCredentials(window.location.href);
    if (credentials.type !== "recovery" || !credentials.tokenHash) return;

    // Preserve the query string; it carries the token_hash.
    window.location.replace(`${RESET_PATH}${window.location.search}`);
  }, [pathname]);

  return null;
}
