import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { upsertListingAdminMeta } from "@/lib/data/listing-admin-meta";
import { getPublicContactsMap } from "@/lib/data/public-contacts";
import { createSeededProfile } from "@/lib/data/seeded-hosts";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { adminQuickRoommateSchema } from "@/lib/validations/admin-quick.schema";

/**
 * Admin quick-create for a roommate profile.
 *
 * Real posts read "Ищу соседку, бюджет 90к, пишите в вотсап" — a name, a few
 * sentences and a budget. Those three are required; everything else defaults,
 * because the alternative is the admin inventing an age and a university for a
 * stranger. See `adminQuickRoommateSchema`.
 */
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const input = adminQuickRoommateSchema.parse(await request.json());

    const uid = await createSeededProfile({
      fullName: input.fullName,
      bio: input.bio,
      age: input.age,
      gender: input.gender,
      university: input.university,
      occupation: input.occupation,
      minBudget: input.minBudget,
      maxBudget: input.maxBudget,
      preferredMoveInDate: input.preferredMoveInDate || undefined,
      photoURL: input.photoURL,
      lifestyle: input.lifestyle,
      contacts: input,
      // A roommate profile is exactly what the /roommates directory is for.
      lookingForApartment: true
    });

    // Provenance is keyed by record id in the same private store the listings
    // use, so "where did this come from" works the same for both.
    if (input.source && Object.values(input.source).some((v) => String(v ?? "").trim())) {
      await upsertListingAdminMeta(uid, input.source);
    }

    return NextResponse.json({ roommate: { uid, fullName: input.fullName } }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * `scope=roommates` (default) lists the roommate directory.
 * `scope=all` lists every profile, which is what the listing host picker needs:
 * a landlord is created with `looking_for_apartment = false` so they stay out of
 * roommate search, and would otherwise be unpickable as a host.
 */
export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const scope = new URL(request.url).searchParams.get("scope");

    let query = supabase.from("profiles").select("*").eq("onboarding_complete", true);
    if (scope !== "all") query = query.eq("looking_for_apartment", true);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const roommates = (data ?? []).map(mapProfileRow);
    // WhatsApp/Instagram have no column; the admin list still has to show them.
    const contacts = await getPublicContactsMap(roommates.map((r) => r.uid));

    return NextResponse.json({ roommates, contacts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
