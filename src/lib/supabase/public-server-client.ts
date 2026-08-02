import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Anon-key client for server-side reads of public data (RLS-gated, not
 * session-scoped) in contexts like generateMetadata() where calling
 * cookies() would force the route into fully dynamic rendering.
 */
export function createSupabasePublicServerClient(): SupabaseClient | null {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) return null;

  return createClient(supabaseConfig.serverUrl, supabaseConfig.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
