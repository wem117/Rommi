import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { getSiteSettings, updateSiteSettings } from "@/lib/data/site-settings";
import { requireAdminUser } from "@/lib/supabase/admin";
import { siteSettingsUpdateSchema } from "@/lib/validations/site-settings.schema";

export async function GET() {
  try {
    await requireAdminUser();
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
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
    return NextResponse.json({ settings });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
