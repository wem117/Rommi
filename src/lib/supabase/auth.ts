import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";

async function syncSession(tokens?: { accessToken: string; refreshToken?: string | null } | null) {
  if (!tokens?.accessToken) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tokens)
  });

  if (!response.ok) {
    throw new Error("Could not sync secure session");
  }
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await syncSession({
    accessToken: data.session?.access_token ?? "",
    refreshToken: data.session?.refresh_token ?? null
  });
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.session?.access_token) {
    await syncSession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token
    });
  }

  return data;
}

function getGoogleRedirectTo(nextPath?: string) {
  // Always return to the SAME origin the user is on (localhost in dev, the
  // deployed domain in prod). This avoids the common failure where a hardcoded
  // NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO env points at the wrong environment.
  // The configured value is used only as a fallback (e.g. non-browser contexts).
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/callback`
      : supabaseConfig.googleRedirectTo;

  if (!base) {
    throw new Error("Cannot determine the OAuth redirect URL for Google sign-in.");
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
      redirectTo: getGoogleRedirectTo(nextPath)
    }
  });

  if (error) throw error;
  return data;
}

export async function sendResetPassword(email: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function sendCurrentUserVerificationEmail() {
  return;
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }

  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  await fetch("/api/auth/session", { method: "DELETE" });
}
