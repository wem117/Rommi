import "server-only";

import { randomUUID } from "node:crypto";

import { upsertPublicContacts } from "@/lib/data/public-contacts";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizePhone, normalizeTelegram } from "@/lib/utils/contacts";
import type { ContactMethods, TemporaryHostInput } from "@/lib/validations/admin-quick.schema";

/**
 * Identifier for a hand-created profile — a landlord or roommate the admin
 * entered from Telegram/WhatsApp/OLX rather than someone who signed up.
 *
 * It is a bare UUID on purpose. `profiles.uid` has no foreign key to
 * `auth.users`, so a standalone row is valid whatever the id looks like — but
 * the uid is part of the listing payload the browser receives and part of the
 * `/roommates/<uid>` URL, so a marker prefix would let any visitor read "admin"
 * off a seeded listing's host. That is exactly the distinction these profiles
 * must not carry, so the id has to be shaped like every other account id.
 */
export function newSeededHostUid(): string {
  return randomUUID();
}

/** Normalises the four contact methods the way the public renderers expect. */
export function normaliseContacts(input: Partial<ContactMethods>): ContactMethods {
  return {
    phone: input.phone?.trim() ? normalizePhone(input.phone) : "",
    whatsapp: input.whatsapp?.trim() ? normalizePhone(input.whatsapp) : "",
    telegram: input.telegram?.trim() ? normalizeTelegram(input.telegram) : "",
    instagram: input.instagram?.trim() ? input.instagram.trim().replace(/^@/, "") : ""
  };
}

/**
 * Creates a public profile for someone who has no Roomi account.
 *
 * The landlords in these posts are not users and will not become users, but a
 * listing still needs a public face that is not the administrator's personal
 * account. This writes a plain profile row: a display name, whatever contacts
 * the post carried, and nothing that says where it came from.
 *
 * `looking_for_apartment` is FALSE for hosts. The /roommates directory selects
 * on that flag, so a landlord created for a listing gets a profile page without
 * appearing in the roommate-search results, where they do not belong.
 */
export async function createSeededProfile(input: {
  fullName: string;
  photoURL?: string;
  contacts?: Partial<ContactMethods>;
  bio?: string;
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  university?: string;
  city?: string;
  occupation?: string;
  minBudget?: number;
  maxBudget?: number;
  preferredMoveInDate?: string;
  lifestyle?: Record<string, string>;
  /** True for a roommate profile, false for a listing host. */
  lookingForApartment: boolean;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const uid = newSeededHostUid();
  const contacts = normaliseContacts(input.contacts ?? {});

  const { error } = await supabase.from("profiles").insert({
    uid,
    full_name: input.fullName,
    age: input.age ?? 0,
    gender: input.gender ?? "prefer_not_to_say",
    university: input.university ?? "",
    city: input.city ?? null,
    occupation: input.occupation ?? "",
    min_budget: input.minBudget ?? 0,
    max_budget: input.maxBudget ?? 0,
    preferred_move_in_date: input.preferredMoveInDate ? new Date(input.preferredMoveInDate).toISOString() : null,
    bio: input.bio ?? "",
    photo_url: input.photoURL || null,
    // Columns that exist for this exact purpose. Telegram and phone are revoked
    // from `anon` at the database, so they reach signed-in visitors only.
    telegram: contacts.telegram || null,
    phone: contacts.phone || null,
    lifestyle: input.lifestyle ?? {
      cleanliness: "moderate",
      sleepSchedule: "balanced",
      guests: "sometimes",
      smoking: "no_preference",
      pets: "no_preference"
    },
    onboarding_complete: true,
    looking_for_apartment: input.lookingForApartment,
    roommate_status: "approved",
    profile_completion: 80
  });
  if (error) throw error;

  // WhatsApp and Instagram have no column; see lib/data/public-contacts.ts.
  if (contacts.whatsapp || contacts.instagram) {
    await upsertPublicContacts(uid, { whatsapp: contacts.whatsapp, instagram: contacts.instagram });
  }

  return uid;
}

/** Creates the listing host described by the "new contact" block of the form. */
export async function createTemporaryHost(host: TemporaryHostInput): Promise<string> {
  return createSeededProfile({
    fullName: host.displayName,
    photoURL: host.photoURL,
    contacts: host,
    lookingForApartment: false
  });
}
