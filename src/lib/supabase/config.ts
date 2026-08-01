/**
 * Reads a public env var, treating a blank value as "not set".
 *
 * `??` alone is not enough: an unset Docker build-arg or an empty line in the
 * runtime env file is inlined as `""`, which would otherwise silently override
 * the default — producing, for example, an EMPTY storage bucket name that
 * breaks every upload and download URL — instead of falling back.
 */
function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const supabaseConfig = {
  // Normalized without a trailing slash so `${url}/rest/v1/...` can never
  // produce a double slash against the self-hosted gateway.
  url: envOr(process.env.NEXT_PUBLIC_SUPABASE_URL, "").replace(/\/+$/, ""),
  anonKey: envOr(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, ""),
  storageBucket: envOr(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET, "roommate-assets"),
  googleRedirectTo: envOr(process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO, "")
};

export const isSupabaseConfigured =
  Boolean(supabaseConfig.url) && Boolean(supabaseConfig.anonKey);
