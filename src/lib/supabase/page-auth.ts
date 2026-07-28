import "server-only";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side auth gate for Server Component pages.
 *
 * Redirects guests to /sign-in with a return URL so they land back on the page
 * they attempted to open after signing in. This is real server-side
 * authorization at the page level — it holds even if a request somehow reaches
 * the page without passing through middleware, so a detail URL cannot be opened
 * directly by an unauthenticated visitor.
 *
 * When Supabase isn't configured (local demo without keys), middleware is the
 * authority for the protected-route decision, so this is a no-op to avoid
 * throwing from `createSupabaseServerClient`.
 */
export async function requirePageAuth(returnTo: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(returnTo)}`);
  }
}
