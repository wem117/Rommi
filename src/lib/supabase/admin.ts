import "server-only";

import { isAdminEmail } from "@/lib/auth/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/supabase/session";

export async function requireAdminUser() {
  const user = await requireSessionUser();
  const supabase = createSupabaseAdminClient();

  // Primary gate: email allowlist. Secondary: an explicit profiles.role flag.
  if (!isAdminEmail(user.email)) {
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("uid", user.id).single();
    if (error || profile?.role !== "admin") {
      throw new Error("Forbidden");
    }
  }

  return { user, supabase };
}

