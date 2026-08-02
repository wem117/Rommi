import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { supabaseConfig } from "@/lib/supabase/config";

function requireServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local.");
  }

  return serviceRoleKey;
}

/**
 * True when both public credentials and the service-role key are present,
 * meaning privileged admin operations can be performed on the server.
 */
export const isSupabaseAdminConfigured =
  Boolean(supabaseConfig.url) &&
  Boolean(supabaseConfig.anonKey) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Request-scoped Supabase client that reads and writes the auth cookies of the
 * current request. Use this for anything that should respect Row Level Security
 * as the signed-in user.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseConfig.serverUrl, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Middleware and route handlers can.
        }
      }
    }
  });
}

/**
 * Service-role client that bypasses Row Level Security. Never expose this to the
 * browser — only use it from server code after an explicit authorization check.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!supabaseConfig.url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local.");
  }

  return createClient(supabaseConfig.serverUrl, requireServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
