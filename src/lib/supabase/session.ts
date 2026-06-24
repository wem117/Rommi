import "server-only";

import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function requireSessionUser() {
  if (!isSupabaseConfigured) {
    throw new Error("UNAUTHENTICATED");
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("__session")?.value;

  if (!accessToken) {
    throw new Error("UNAUTHENTICATED");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("UNAUTHENTICATED");
  }

  return data.user;
}

