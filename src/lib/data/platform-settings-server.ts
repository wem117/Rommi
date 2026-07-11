import "server-only";

import { cache } from "react";

import { createSupabasePublicServerClient } from "@/lib/supabase/public-server-client";
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from "@/lib/data/public-settings";

/**
 * Server-side, request-memoized read of the public "platform" site setting
 * (site name, SEO copy, analytics id, social links, footer, contact info).
 * Uses the anon key with no cookies so it doesn't opt pages out of static
 * rendering. Falls back to defaults when unconfigured, missing, or on error.
 */
export const getPlatformSettingsServer = cache(async (): Promise<PlatformSettings> => {
  const supabase = createSupabasePublicServerClient();
  if (!supabase) return DEFAULT_PLATFORM_SETTINGS;

  try {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "platform").maybeSingle();
    if (error || !data?.value) return DEFAULT_PLATFORM_SETTINGS;
    return { ...DEFAULT_PLATFORM_SETTINGS, ...(data.value as Partial<PlatformSettings>) };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
});
