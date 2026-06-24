import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/config";

export function createSupabaseServerClient() {
  return createClient(
    supabaseConfig.url || "https://placeholder.supabase.co",
    supabaseConfig.anonKey || "placeholder-anon-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export function createSupabaseAdminClient() {
  return createClient(
    supabaseConfig.url || "https://placeholder.supabase.co",
    supabaseConfig.serviceRoleKey || supabaseConfig.anonKey || "placeholder-service-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

