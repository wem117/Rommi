import { createBrowserSupabaseClient, supabase } from "@/lib/supabase";

let client: typeof supabase | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserSupabaseClient();
  }

  return client;
}

export { supabase };
