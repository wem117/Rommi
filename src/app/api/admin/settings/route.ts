import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { revalidatePublic } from "@/lib/api/revalidate";
import { getHomepageStatCounts } from "@/lib/data/homepage-stats";
import { getSiteSettings, updateSiteSettings } from "@/lib/data/site-settings";
import { requireAdminUser } from "@/lib/supabase/admin";
import { siteSettingsUpdateSchema } from "@/lib/validations/site-settings.schema";

export async function GET() {
  try {
    await requireAdminUser();
    const [settings, statCounts] = await Promise.all([getSiteSettings(), getHomepageStatCounts()]);
    // statCounts is read-only context so the admin can see what the baseline is
    // being added to; it is derived, never stored.
    return NextResponse.json({ settings, statCounts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const input = siteSettingsUpdateSchema.parse(await request.json());
    await updateSiteSettings(input);
    const settings = await getSiteSettings();
    // Purges the ISR-cached pages that read `platform` (site name, SEO copy,
    // the Google Analytics ID, ...), so a save — including toggling Analytics
    // on/off — takes effect on the next request instead of waiting out the
    // revalidate window.
    revalidatePublic("settings");
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
