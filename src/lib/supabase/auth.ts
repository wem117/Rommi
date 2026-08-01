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
 * the recovery session arrives in one.
 */
function getPasswordResetRedirectTo() {
  const origin = typeof window !== "undefined" ? window.location.origin : siteConfig.url;
  return new URL("/reset-password", origin).toString();
}

/**
 * Sends the password-recovery email WITHOUT PKCE, deliberately.
 *
 * Why not the shared browser client:
 * `@supabase/ssr`'s createBrowserClient hardcodes `flowType: "pkce"`, and
 * resetPasswordForEmail() attaches a `code_challenge` whenever the flow is PKCE.
 * GoTrue then issues a PKCE recovery link — verified against production: the
 * stored token is `pkce_...` and /verify redirects to
 * `/reset-password?code=<uuid>`. Redeeming that code REQUIRES the
 * `code_verifier` that was generated in, and stored by, the browser that asked
 * for the reset.
 *
 * Password-reset links are email links: they get opened on a phone when the
 * request came from a laptop, or inside Gmail's in-app webview, which is a
 * different storage context. There the verifier does not exist, so the exchange
 * is cryptographically impossible and the user is told "this link is invalid or
 * has expired" — for a link that is perfectly valid. PKCE binds a credential to
 * a single browser; email delivery deliberately crosses browsers. The two
 * cannot be combined for recovery.
 *
 * Sending the request through an implicit-flow client omits the code_challenge,
 * so GoTrue mints the standard recovery link instead: it carries the session in
 * the URL fragment and therefore works from ANY device.
 * `establishRecoverySession()` installs those tokens with setSession() and
 * immediately scrubs them from the address bar. Fragments are never sent to a
 * server, so they stay out of access logs and the Referer header.
 *
 * OAuth still uses PKCE (same browser throughout), which is where PKCE belongs.
 */
export async function sendResetPassword(email: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseRecoveryRequestClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectTo()
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
