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
 *    that check entirely — it just installs the tokens.
 *
 * 2. PKCE links (`?code=...`) require the `code_verifier` that was stored when
 *    the reset was REQUESTED. Recovery links are very often opened in a
 *    different browser than the one that requested them (desktop -> phone), or
 *    in an email client's in-app webview, where that verifier does not exist and
 *    the exchange fails. We still attempt the exchange, but a failure here is
 *    reported honestly instead of being mistaken for an expired link.
 *
 * Returns whether a usable recovery session now exists. Never throws.
 */
export async function establishRecoverySession(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const supabase = getSupabaseBrowserClient();

  // A session may already be in place: supabase-js can succeed on its own (e.g.
  // a same-browser PKCE link), or the visitor is simply signed in already.
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return true;

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
      // Strip the credentials from the address bar so they are not left in
      // history, shared links, or the Referer header.
      window.history.replaceState(null, "", window.location.pathname);
      return true;
    }
  }

  // --- PKCE: ?code= in the query string --------------------------------------
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      window.history.replaceState(null, "", window.location.pathname);
      return true;
    }
  }

  return false;
}
