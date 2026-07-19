import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapProfileRow } from "@/lib/supabase/mappers";

// Admin-created roommate profile (standalone — not linked to an auth account).
const adminRoommateCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name").max(120),
  age: z.number().int().min(16, "Minimum age is 16").max(80, "Enter a valid age"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  university: z.string().trim().min(1, "Select a university").max(160),
  occupation: z.string().trim().min(2, "Enter an occupation").max(120),
  maxBudget: z.number().int().min(0).max(10_000_000),
  bio: z.string().trim().max(1000).default(""),
  photoURL: z.string().trim().url("Photo must be a valid URL").optional().or(z.literal("")),
  lifestyle: z
    .object({
      smoking: z.enum(["no", "yes", "outside", "no_preference"]).default("no"),
      pets: z.enum(["no_pets", "pet_friendly", "has_pets", "no_preference"]).default("no_preference"),
      cleanliness: z.enum(["relaxed", "moderate", "very_clean"]).default("moderate"),
      sleepSchedule: z.enum(["early_bird", "balanced", "night_owl"]).default("balanced"),
      guests: z.enum(["rarely", "sometimes", "often"]).default("sometimes")
    })
    .default({ smoking: "no", pets: "no_preference", cleanliness: "moderate", sleepSchedule: "balanced", guests: "sometimes" })
});

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdminUser();
    const input = adminRoommateCreateSchema.parse(await request.json());

    const row = {
      // Prefixed uid marks admin-created profiles; profiles.uid has no FK to
      // auth.users, so standalone rows are valid (same as demo/seed profiles).
      uid: `roomi-admin-${randomUUID()}`,
      full_name: input.fullName,
      age: input.age,
      gender: input.gender,
      university: input.university,
      occupation: input.occupation,
      max_budget: input.maxBudget,
      bio: input.bio,
      photo_url: input.photoURL || null,
      lifestyle: input.lifestyle,
      onboarding_complete: true,
      looking_for_apartment: true,
      roommate_status: "approved",
      profile_completion: 80
    };

    const { data, error } = await supabase.from("profiles").insert(row).select("*").single();
    if (error) throw error;

    return NextResponse.json({ roommate: mapProfileRow(data) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET() {
  try {
    const { supabase } = await requireAdminUser();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("onboarding_complete", true)
      .eq("looking_for_apartment", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ roommates: (data ?? []).map(mapProfileRow) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
