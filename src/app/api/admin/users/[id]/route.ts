import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { getPublicContacts, upsertPublicContacts } from "@/lib/data/public-contacts";
import { normalizePhone, normalizeTelegram } from "@/lib/utils/contacts";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { deleteUserAccount, requireAdminUser } from "@/lib/supabase/admin";

/**
 * Every editable field of a profile.
 *
 * PATCH semantics: only keys actually present are written, so a dialog that
 * shows a subset of fields can never blank the rest.
 *
 * `onboardingComplete` is here deliberately. Support cases exist where a user's
 * flag is wrong — an interrupted signup, an imported profile — and until now the
 * only remedy was direct database access. It is also the flag the app's route
 * guards read, so an admin needs to be able to both set and clear it.
 */
const adminProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  age: z.number().int().min(0).max(120).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  university: z.string().trim().max(160).optional(),
  occupation: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(4000).optional(),
  minBudget: z.number().int().min(0).optional(),
  maxBudget: z.number().int().min(0).optional(),
  preferredMoveInDate: z.string().trim().optional(),
  photoURL: z.string().trim().url().optional().or(z.literal("")),
  lookingForApartment: z.boolean().optional(),
  onboardingComplete: z.boolean().optional(),
  role: z.enum(["user", ADMIN_ROLE]).optional(),
  verified: z.boolean().optional(),
  banned: z.boolean().optional(),
  suspended: z.boolean().optional(),
  roommateStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  featured: z.boolean().optional(),
  featuredPosition: z.number().int().min(0).nullable().optional(),
  contactsHidden: z.boolean().optional(),
  // Contact methods. phone/telegram are columns; whatsapp/instagram live in the
  // private settings row (see lib/data/public-contacts.ts).
  phone: z.string().trim().max(40).optional(),
  telegram: z.string().trim().max(120).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  instagram: z.string().trim().max(120).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const input = adminProfileUpdateSchema.parse(await request.json());

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.fullName !== undefined) payload.full_name = input.fullName;
    if (input.email !== undefined) payload.email = input.email || null;
    if (input.university !== undefined) payload.university = input.university;
    if (input.occupation !== undefined) payload.occupation = input.occupation;
    if (input.bio !== undefined) payload.bio = input.bio;
    if (input.role !== undefined) payload.role = input.role;
    if (input.verified !== undefined) {
      payload.verified = input.verified;
      payload.verified_at = input.verified ? new Date().toISOString() : null;
    }
    if (input.banned !== undefined) {
      payload.banned = input.banned;
      payload.banned_at = input.banned ? new Date().toISOString() : null;
    }
    if (input.suspended !== undefined) {
      payload.suspended = input.suspended;
      payload.suspended_at = input.suspended ? new Date().toISOString() : null;
    }
    if (input.roommateStatus !== undefined) payload.roommate_status = input.roommateStatus;
    if (input.featured !== undefined) payload.featured = input.featured;
    if (input.featuredPosition !== undefined) payload.featured_position = input.featuredPosition;
    if (input.contactsHidden !== undefined) payload.contacts_hidden = input.contactsHidden;
    if (input.age !== undefined) payload.age = input.age;
    if (input.gender !== undefined) payload.gender = input.gender;
    if (input.minBudget !== undefined) payload.min_budget = input.minBudget;
    if (input.maxBudget !== undefined) payload.max_budget = input.maxBudget;
    if (input.photoURL !== undefined) payload.photo_url = input.photoURL || null;
    if (input.lookingForApartment !== undefined) payload.looking_for_apartment = input.lookingForApartment;
    if (input.onboardingComplete !== undefined) payload.onboarding_complete = input.onboardingComplete;
    if (input.preferredMoveInDate !== undefined) {
      payload.preferred_move_in_date = input.preferredMoveInDate
        ? new Date(input.preferredMoveInDate).toISOString()
        : null;
    }
    if (input.phone !== undefined) payload.phone = input.phone ? normalizePhone(input.phone) : null;
    if (input.telegram !== undefined) payload.telegram = input.telegram ? normalizeTelegram(input.telegram) : null;

    const { data, error } = await supabase.from("profiles").update(payload).eq("uid", id).select("*").single();
    if (error) throw error;

    // WhatsApp/Instagram have no column; they are stored alongside, and must be
    // written after the row update so a failed profile write does not leave the
    // two stores disagreeing.
    if (input.whatsapp !== undefined || input.instagram !== undefined) {
      await upsertPublicContacts(id, {
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : "" } : {}),
        ...(input.instagram !== undefined ? { instagram: input.instagram.replace(/^@/, "") } : {})
      });
    }

    const contacts = await getPublicContacts(id);
    return NextResponse.json({ user: mapProfileRow(data), contacts });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdminUser();
    await deleteUserAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
