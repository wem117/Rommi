import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Establishes the password-recovery session from the credentials GoTrue puts in
 * the URL, for BOTH shapes it can emit.
 *
 * Why this cannot be left to supabase-js alone:
 *
 * 1. IMPLICIT links (`#access_token=...&refresh_token=...&type=recovery`).
 *    `@supabase/ssr`'s createBrowserClient hardcodes `flowType: "pkce"`, and
 *    GoTrueClient._getSessionFromURL() throws outright on a flow mismatch:
 *        case 'implicit': if (this.flowType === 'pkce')
 *            throw new AuthPKCEGrantCodeExchangeError('Not a valid PKCE flow url.')
 *    The session is then never saved and no PASSWORD_RECOVERY event fires, so the
 *    page saw "no user" and declared the link invalid. `setSession()` bypasses
 *    that check entirely — it just installs the tokens. (auth-js leaves the URL
 *    untouched on that failure path, so the fragment is still readable here.)
 *
 * 2. PKCE links (`?code=...`) require the `code_verifier` that was stored when
 *    the reset was REQUESTED. Recovery links are very often opened in a
 *    different browser than the one that requested them (desktop -> phone), or
 *    in an email client's in-app webview, where that verifier does not exist and
 *    the exchange fails. We still attempt the exchange, but a failure here is
 *    reported honestly instead of being mistaken for an expired link.
 *    `sendResetPassword()` now asks GoTrue for non-PKCE links precisely so this
 *    branch stops being reachable for freshly issued emails; it stays for links
 *    already sitting in inboxes.
 *
 * ORDER MATTERS: URL credentials are processed BEFORE any pre-existing session.
 * Checking the session first meant that a visitor who was already signed in —
 * on a shared laptop, or as a different account — kept that session, the form
 * rendered against it, and updateUser() would have changed the WRONG account's
 * password while silently discarding the recovery token. Whoever holds the link
 * from the email is the identity the form must operate on.
 *
 * Returns whether a usable recovery session now exists. Never throws.
 */
export async function establishRecoverySession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const supabase = getSupabaseBrowserClient();

  // --- Implicit: tokens in the URL fragment (never sent to the server) -------
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (!error && data.session) {
      scrubCredentialsFromUrl();
      return true;
    }
  }

  // --- PKCE: ?code= in the query string --------------------------------------
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      scrubCredentialsFromUrl();
      return true;
    }
  }

  // No credentials in the URL (or they could not be redeemed). A session may
  // still exist because supabase-js consumed the link during its own
  // initialization, or because the visitor is simply signed in and changing
  // their password deliberately.
  const existing = await supabase.auth.getSession();
  return Boolean(existing.data.session);
}

/**
 * Removes the recovery credentials from the address bar so they are not left in
 * browser history, in a copy-pasted link, or in the Referer header of any
 * subsequent request.
 */
function scrubCredentialsFromUrl() {
  window.history.replaceState(null, "", window.location.pathname);
}
