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

/**
 * Origin the SERVER should use to reach Supabase.
 *
 * `NEXT_PUBLIC_SUPABASE_URL` is the browser-facing address (https://api.roomi.kz).
 * It resolves to Cloudflare, so when server-side code uses it, a request that
 * could have stayed on the loopback interface instead leaves the machine,
 * crosses the public internet to a Cloudflare PoP, and is routed straight back
 * to the same host. Measured on this deployment: **239–805 ms via the public
 * hostname versus 3–24 ms to the same gateway locally** — a penalty paid by
 * every server-rendered page that touches the database.
 *
 * Set `SUPABASE_INTERNAL_URL` (server-only, never NEXT_PUBLIC_*) to the
 * gateway's address on the container network, e.g. `http://kong:8000`, and
 * server-side traffic takes the short path.
 *
 * Deliberately falls back to the public URL when unset, so the app behaves
 * exactly as before on any host where no internal route has been configured.
 * The browser is never affected — it cannot see this value.
 */
const serverUrl = envOr(
  process.env.SUPABASE_INTERNAL_URL,
  envOr(process.env.NEXT_PUBLIC_SUPABASE_URL, "")
).replace(/\/+$/, "");

export const supabaseConfig = {
  // Normalized without a trailing slash so `${url}/rest/v1/...` can never
  // produce a double slash against the self-hosted gateway.
  //
  // PUBLIC origin. Anything a browser will load — image URLs, auth redirects,
  // links persisted to the database — must be built from this, never serverUrl.
  url: envOr(process.env.NEXT_PUBLIC_SUPABASE_URL, "").replace(/\/+$/, ""),
  /** Server-side origin for data access. See the note on `serverUrl` above. */
  serverUrl,
  anonKey: envOr(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, ""),
  storageBucket: envOr(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET, "roommate-assets"),
  googleRedirectTo: envOr(process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_REDIRECT_TO, "")
};

export const isSupabaseConfigured =
  Boolean(supabaseConfig.url) && Boolean(supabaseConfig.anonKey);
