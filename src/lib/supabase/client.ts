import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;
let recoveryRequestClient: SupabaseClient | null = null;

function assertConfigured() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local."
    );
  }
}

export function getSupabaseBrowserClient(): SupabaseClient {
  assertConfigured();

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
}

/**
 * A throwaway client used for exactly one call: requesting a password-recovery
 * email in the IMPLICIT flow.
 *
 * `@supabase/ssr`'s createBrowserClient hardcodes `flowType: "pkce"`, and
 * GoTrueClient.resetPasswordForEmail() attaches a `code_challenge` whenever the
 * flow is PKCE. That makes GoTrue mint a PKCE recovery link, which can only be
 * redeemed by the browser that holds the matching `code_verifier` — see
 * `sendResetPassword()` for why that is fatal for email links.
 *
 * This client is deliberately inert everywhere else:
 *   - `persistSession: false`  -> auth-js uses in-memory storage, so it never
 *                                 writes to localStorage and cannot clobber the
 *                                 real session or its code verifier.
 *   - `detectSessionInUrl: false` -> it never touches the URL.
 *   - `autoRefreshToken: false` -> no background timers.
 * It holds no session; it is only a typed transport for POST /auth/v1/recover.
 */
export function getSupabaseRecoveryRequestClient(): SupabaseClient {
  assertConfigured();

  if (!recoveryRequestClient) {
    recoveryRequestClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return recoveryRequestClient;
}
