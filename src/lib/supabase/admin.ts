import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/supabase/session";

export async function requireAdminUser() {
  const user = await requireSessionUser();
  const supabase = createSupabaseAdminClient();
  const { data: profile, error } = await supabase.from("profiles").select("role").eq("uid", user.id).single();

  if (error || profile?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { user, supabase };
}

