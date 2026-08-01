import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/errors";

/** Digits in the OTP GoTrue puts in `{{ .Token }}`. */
export const RECOVERY_CODE_LENGTH = 6;

/**
 * Everything GoTrue can put in a recovery URL, in one shape.
 *
 * Four shapes exist because GoTrue's behaviour depends on the email template
 * and on the flow the reset was requested with:
 *
 *   token_hash    the officially recommended shape, produced by a template that
 *                 builds its own link from `{{ .TokenHash }}`. A query param, so
 *                 it survives servers, redirects and link rewriting, and it is
 *                 redeemed by POST — see verifyRecoveryTokenHash().
 *   access_token  implicit links, where GoTrue's own /verify endpoint already
 *                 consumed the token and handed back a session in the fragment.
 *   code          PKCE links; only redeemable in the browser that requested the
 *                 reset, because that is where the code_verifier lives.
 *   error_*       GoTrue reporting a genuinely dead link (expired, already used).
 *                 Worth reading so we can say what actually happened.
 *
 * Both `?query` and `#fragment` are searched: GoTrue uses the fragment for
 * implicit results and the query for everything else, and a template author can
 * legitimately choose either.
 */
export type RecoveryCredentials = {
  tokenHash: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  email: string | null;
  /** GoTrue's action marker: "recovery", "signup", "magiclink", "email_change". */
  type: string | null;
  errorDescription: string | null;
};

export function readRecoveryCredentials(href: string): RecoveryCredentials {
  const url = new URL(href);
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));

  const pick = (key: string) => query.get(key) ?? fragment.get(key);

  const errorDescription = pick("error_description") ?? pick("error_code") ?? pick("error");

  return {
    tokenHash: pick("token_hash"),
    accessToken: pick("access_token"),
    refreshToken: pick("refresh_token"),
    code: pick("code"),
    email: pick("email"),
    type: pick("type"),
    // `+` survives URLSearchParams decoding as a space; error strings are
    // form-encoded by GoTrue, so restore it for a readable message.
    errorDescription: errorDescription ? errorDescription.replace(/\+/g, " ") : null
  };
}

/**
 * The result of trying to turn a recovery URL into a session.
 *
 * `no-credentials` and `failed` are kept apart on purpose: the first is a
 * visitor who simply opened /reset-password, the second is a link that was
 * present and did not work. Both land on the manual-code entry, but only the
 * second one has something to apologise for.
 */
export type RecoveryOutcome =
  | { status: "authenticated" }
  | { status: "no-credentials"; email: string | null }
  | { status: "failed"; email: string | null; message: string };

/**
 * Redeems the link-borne recovery credential and installs the session.
 *
 * The primary path is `verifyOtp({ token_hash, type: "recovery" })`. That call
 * is a POST to /auth/v1/verify, which matters more than it looks:
 *
 *   - It is not bound to a browser. No code_verifier is involved, so the link
 *     works when the request came from a laptop and the mail is opened on a
 *     phone — the normal case, and the one PKCE cannot serve.
 *   - It is not a GET, so the mail-scanning proxies that prefetch every link in
 *     a message (Outlook Safe Links, corporate gateways, some Gmail paths)
 *     cannot silently burn the single-use token before the user clicks it.
 *   - The credential rides in the query string, not the fragment, so it is not
 *     lost across a redirect or a client-side navigation.
 *
 * The implicit and PKCE branches remain for links already sitting in inboxes.
 */
export async function establishRecoverySession(): Promise<RecoveryOutcome> {
  if (typeof window === "undefined") return { status: "no-credentials", email: null };

  const supabase = getSupabaseBrowserClient();
  const credentials = readRecoveryCredentials(window.location.href);
  const { email } = credentials;

  if (credentials.errorDescription) {
    scrubCredentialsFromUrl();
    return { status: "failed", email, message: credentials.errorDescription };
  }

  if (credentials.tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: credentials.tokenHash,
      type: "recovery"
    });
    scrubCredentialsFromUrl();
    if (!error && data.session) return { status: "authenticated" };
    return { status: "failed", email, message: getErrorMessage(error) };
  }

  if (credentials.accessToken && credentials.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken
    });
    scrubCredentialsFromUrl();
    if (!error && data.session) return { status: "authenticated" };
    return { status: "failed", email, message: getErrorMessage(error) };
  }

  if (credentials.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(credentials.code);
    scrubCredentialsFromUrl();
    if (!error && data.session) return { status: "authenticated" };
    return { status: "failed", email, message: getErrorMessage(error) };
  }

  // No credential in the URL. A session may still exist — either supabase-js
  // consumed the link during its own initialization, or the visitor is signed
  // in and is changing their password deliberately.
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return { status: "authenticated" };

  return { status: "no-credentials", email };
}

/**
 * Redeems the 6-digit code from `{{ .Token }}`.
 *
 * This is the path that cannot be broken by anything in between: no link to
 * rewrite, no fragment to drop, no redirect to mishandle, nothing for a scanner
 * to prefetch, and no dependency on which browser or device is being used. When
 * the link path fails for an environment we cannot control, this is what the
 * user falls back to.
 */
export async function verifyRecoveryCode(email: string, code: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.replace(/\D/g, ""),
    type: "recovery"
  });

  if (error) throw error;
  if (!data.session) throw new Error("Recovery code accepted but no session was returned.");
}

/**
 * Removes the recovery credentials from the address bar so they are not left in
 * browser history, in a copy-pasted link, or in the Referer header of any
 * subsequent request.
 */
function scrubCredentialsFromUrl() {
  window.history.replaceState(null, "", window.location.pathname);
}
