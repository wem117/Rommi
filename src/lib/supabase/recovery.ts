import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/errors";

/** Digits in the OTP GoTrue puts in `{{ .Token }}`. */
export const RECOVERY_CODE_LENGTH = 6;

/**
 * What a recovery URL may carry.
 *
 * Exactly one credential shape is supported: `token_hash`, produced by a
 * template that builds its own link from `{{ .TokenHash }}`. It is redeemed with
 * verifyOtp(), which POSTs to /auth/v1/verify.
 *
 * Deliberately NOT supported, and deliberately not parsed:
 *
 *   ?code=...          the PKCE authorization code. Redeeming it requires the
 *                      `code_verifier` written into the storage of the browser
 *                      that REQUESTED the reset. Traced in production: when the
 *                      email is opened anywhere else, supabase-js throws
 *                      AuthPKCECodeVerifierMissingError before it issues any
 *                      request at all, and the page reports "invalid or expired"
 *                      for a credential the server would have accepted. PKCE
 *                      binds a credential to one browser; recovery mail crosses
 *                      browsers by design.
 *
 *   #access_token=...  a session handed back in the URL fragment. Fragments are
 *                      never sent to a server, are dropped by redirects, and put
 *                      a live session token in browser history.
 *
 * `error_description` is still read so a genuinely dead link (expired, already
 * used) can be reported as what it is.
 */
export type RecoveryCredentials = {
  tokenHash: string | null;
  email: string | null;
  /** GoTrue's action marker: "recovery", "signup", "magiclink", "email_change". */
  type: string | null;
  errorDescription: string | null;
};

export function readRecoveryCredentials(href: string): RecoveryCredentials {
  const query = new URL(href).searchParams;
  const errorDescription = query.get("error_description") ?? query.get("error_code") ?? query.get("error");

  return {
    tokenHash: query.get("token_hash"),
    email: query.get("email"),
    type: query.get("type"),
    // `+` survives URLSearchParams decoding as a space; GoTrue form-encodes its
    // error strings, so restore it for a readable message.
    errorDescription: errorDescription ? errorDescription.replace(/\+/g, " ") : null
  };
}

/**
 * The result of trying to turn a recovery URL into a session.
 *
 * `no-credentials` and `failed` are kept apart on purpose: the first is a
 * visitor who simply opened /reset-password, the second is a link that was
 * present and did not work. Both land on the code entry, but only the second one
 * has something to apologise for.
 */
export type RecoveryOutcome =
  | { status: "authenticated" }
  | { status: "no-credentials"; email: string | null }
  | { status: "failed"; email: string | null; message: string };

/**
 * Redeems the `token_hash` from the emailed link, if one is present.
 *
 * `verifyOtp({ token_hash, type: "recovery" })` POSTs to /auth/v1/verify, which
 * matters in three ways:
 *
 *   - nothing is bound to a browser, so the link works when the reset was asked
 *     for on a laptop and the mail is opened on a phone;
 *   - a POST cannot be triggered by the mail-scanning proxies that prefetch
 *     every link in a message, so the single-use token is not burned before the
 *     user clicks;
 *   - the credential rides in the query string, so it survives redirects.
 *
 * On success the SDK saves the session and emits PASSWORD_RECOVERY itself.
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

  // No credential in the URL. A session may still exist because the visitor is
  // signed in and is changing their password deliberately.
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return { status: "authenticated" };

  return { status: "no-credentials", email };
}

/**
 * Redeems the 6-digit code from `{{ .Token }}`.
 *
 * The path nothing in between can break: no link to rewrite, no fragment to
 * drop, no redirect to mishandle, nothing for a scanner to prefetch, and no
 * dependency on which browser or device is being used.
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
