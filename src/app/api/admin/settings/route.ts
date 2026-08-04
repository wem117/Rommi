import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
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

    // The `platform` settings (site name, SEO copy, Google Analytics ID, ...)
    // are read by the root layout, which most routes inherit via ISR
    // (`revalidate = 120`, see src/app/layout.tsx). Without an explicit
    // revalidation here, a change only takes effect once the 2-minute window
    // has elapsed AND a visitor happens to request the page — on a low-traffic
    // route that can sit stale indefinitely. Revalidating every layout right
    // after a save makes the change apply on the very next request instead.
    revalidatePath("/", "layout");

    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
