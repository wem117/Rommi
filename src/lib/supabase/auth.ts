import { siteConfig } from "@/lib/site-config";
import { getSupabaseBrowserClient, getSupabaseRecoveryRequestClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Persists the current user's Terms/Privacy acceptance. The server generates
 * the timestamp and version, so nothing here is trusted from the client; this
 * only signals "the user ticked the box". Failures are non-fatal to sign-up —
 * the acceptance is also captured in the auth user's metadata at creation time
 * and can be reconciled on a later authenticated request.
 */
export async function recordTermsAcceptance(): Promise<void> {
  try {
    await fetch("/api/auth/accept-terms", { method: "POST" });
  } catch {
    // Network hiccup: sign-up already succeeded, so don't block the user.
  }
}

export async function signUpWithEmail(email: string, password: string, policyVersion?: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Captured atomically with account creation so the acceptance survives the
    // email-confirmation flow, where no session exists yet to call the API.
    options: policyVersion
      ? { data: { terms_accepted: true, terms_version: policyVersion } }
      : undefined
  });
  if (error) throw error;

  // With email confirmation disabled a session exists immediately, so write the
  // authoritative, server-timestamped record right away.
  if (data.session?.access_token) {
    await recordTermsAcceptance();
  }

  return data;
}

// Always return to the SAME origin the user is on (localhost in dev, the
// deployed domain in prod). This avoids the common failure where a hardcoded
// NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO env points at the wrong environment.
// The configured value is used only as a fallback (e.g. non-browser contexts).
// Shared by Google OAuth and password-reset links — both exchange a `code`
// via /api/auth/callback, which then forwards to `nextPath`.
function getAuthCallbackRedirectTo(nextPath?: string) {
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/callback`
      : supabaseConfig.googleRedirectTo;

  if (!base) {
    throw new Error("Cannot determine the auth redirect URL.");
  }

  const callbackUrl = new URL(base, typeof window !== "undefined" ? window.location.origin : undefined);

  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
    callbackUrl.searchParams.set("next", nextPath);
  }

  return callbackUrl.toString();
}

export async function signInWithGoogle(nextPath?: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackRedirectTo(nextPath)
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Where a recovery email should land the user: the /reset-password PAGE, never
 * the /api/auth/callback ROUTE. A server route cannot read a URL fragment, and
 * legacy recovery links deliver the session in one.
 *
 * The email carries the address so the page can prefill it on the manual-code
 * form — the user is usually on a different device from the one that asked for
 * the reset, where the app knows nothing about them yet.
 */
function getPasswordResetRedirectTo(email: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : siteConfig.url;
  const target = new URL("/reset-password", origin);
  target.searchParams.set("email", email);
  return target.toString();
}

/**
 * Sends the password-recovery email, deliberately NOT under PKCE.
 *
 * The recovery email offers the user two ways in, and this call has to keep both
 * of them usable:
 *
 *   1. a link built from `{{ .TokenHash }}`, redeemed by
 *      verifyOtp({ token_hash, type: "recovery" }) — a POST, so no mail scanner
 *      can burn the single-use token by prefetching it, and a query parameter,
 *      so nothing is lost to a dropped fragment;
 *   2. the 6-digit code in `{{ .Token }}`, redeemed by
 *      verifyOtp({ email, token, type: "recovery" }).
 *
 * Neither is bound to a browser, which is the whole point. The shared browser
 * client cannot be used to make the request: `@supabase/ssr`'s
 * createBrowserClient hardcodes `flowType: "pkce"`, and resetPasswordForEmail()
 * attaches a `code_challenge` whenever the flow is PKCE. GoTrue then mints a
 * PKCE link — verified against production, where the stored token came back as
 * `pkce_...` and /verify redirected to `/reset-password?code=<uuid>`. Redeeming
 * that code requires the `code_verifier` held by the browser that ASKED for the
 * reset, and recovery mail is opened on a phone when the request came from a
 * laptop, or inside Gmail's in-app webview, which is a different storage
 * context. PKCE binds a credential to one browser; email delivery deliberately
 * crosses browsers.
 *
 * Requesting through an implicit-flow client omits the code_challenge, so a
 * deployment still running the stock `{{ .ConfirmationURL }}` template degrades
 * to a fragment link the page can also handle, instead of a PKCE link that is
 * cryptographically impossible to redeem off-device.
 *
 * OAuth still uses PKCE (same browser throughout), which is where PKCE belongs.
 */
export async function sendResetPassword(email: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseRecoveryRequestClient();
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: getPasswordResetRedirectTo(normalized)
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function sendCurrentUserVerificationEmail() {
  return;
}

export async function signOut() {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
