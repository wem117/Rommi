import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const supabaseAdmin = createSupabaseAdminClient();
