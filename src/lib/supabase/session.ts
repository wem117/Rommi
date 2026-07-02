import "server-only";

import { headers } from "next/headers";

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function requireSessionUser() {
  if (!isSupabaseConfigured) {
    throw new Error("UNAUTHENTICATED");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (!error && user) {
    return user;
  }

  // Keep Authorization support for non-browser callers and older client code.
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const accessToken = authHeader.split("Bearer ")[1];

  const adminSupabase = createSupabaseAdminClient();
  const { data, error: adminError } = await adminSupabase.auth.getUser(accessToken);

  if (adminError || !data.user) {
    throw new Error("UNAUTHENTICATED");
  }

  return data.user;
}
