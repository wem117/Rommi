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
  if (!supabaseConfig.googleRedirectTo) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO. Add it to .env.local.");
  }

  const callbackUrl = new URL(supabaseConfig.googleRedirectTo, window.location.origin);

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
