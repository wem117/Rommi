import { createClient } from "@supabase/supabase-js";

let client:
  | ReturnType<typeof createClient>
  | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
    );
  }

  return client;
}

export const supabase = getSupabaseClient();
