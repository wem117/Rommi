import "server-only";

import { ADMIN_ROLE, isAdminEmail } from "@/lib/auth/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/supabase/session";

export async function requireAdminUser() {
  const user = await requireSessionUser();
  const supabase = createSupabaseAdminClient();

  // Gates, in order: env allowlist, profiles.role flag, then the admin-managed
  // Settings > Admin emails list (site_settings), so admins can grant access
  // to teammates without an env var change or redeploy.
  if (!isAdminEmail(user.email)) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("uid", user.id).single();

    if (profile?.role !== ADMIN_ROLE) {
      const email = user.email?.trim().toLowerCase();
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_emails")
        .maybeSingle();

      const dbAdminEmails = Array.isArray(setting?.value)
        ? (setting.value as unknown[]).filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase())
        : [];

      if (!email || !dbAdminEmails.includes(email)) {
        throw new Error("Forbidden");
      }
    }
  }

  return { user, supabase };
}

/**
 * Deletes a user's profile row and their Supabase Auth account. Auth deletion
 * is best-effort (demo/seed profile ids aren't real auth users), so profile
 * row deletion is what actually determines success.
 */
export async function deleteUserAccount(uid: string) {
  const supabase = createSupabaseAdminClient();

  const { error: profileError } = await supabase.from("profiles").delete().eq("uid", uid);
  if (profileError) throw profileError;

  try {
    await supabase.auth.admin.deleteUser(uid);
  } catch {
    // Non-fatal: uid may not correspond to a real auth user (demo data, migrations).
  }
}

