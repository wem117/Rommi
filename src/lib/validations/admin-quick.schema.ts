import { z } from "zod";

import { MAX_MONTHLY_RENT } from "@/lib/validations/monthly-rent";

/**
 * Schemas for the admin's paste-and-publish workflow.
 *
 * These are deliberately NOT `listingSchema`. The public "list a room" flow is
 * a landlord describing their own property, so it can insist on an address, a
 * nearest university, a meaningful description and a move-in date — the person
 * filling it in knows all of them.
 *
 * The admin flow is a different job: someone is re-typing a Telegram post that
 * says "Комната у КБТУ, 150к, звоните". Most fields simply are not in the
 * source. Holding the admin to the public form's requirements would mean
 * inventing an address, and invented data is worse than absent data — it is
 * wrong on a live page and nobody knows it is wrong.
 *
 * So: title, description, rent and city are required, because without them the
 * listing cannot be read, priced or found. Everything else is optional with a
 * defensible default, and the admin can complete it later from the same screen.
 * The public schema is untouched.
 */

/** Optional public contact methods, copied straight out of the source post. */
export const contactMethodsSchema = z.object({
  phone: z.string().trim().max(40).default(""),
  whatsapp: z.string().trim().max(40).default(""),
  telegram: z.string().trim().max(120).default(""),
  instagram: z.string().trim().max(120).default("")
});

export type ContactMethods = z.infer<typeof contactMethodsSchema>;

/**
 * Where the post came from and what the admin thought about it.
 * Never rendered on a public page — see lib/data/listing-admin-meta.ts.
 */
export const adminSourceSchema = z.object({
  sourceUrl: z.string().trim().max(500).default(""),
  sourceTelegram: z.string().trim().max(200).default(""),
  sourceWhatsapp: z.string().trim().max(200).default(""),
  sourceFacebook: z.string().trim().max(200).default(""),
  sourceNote: z.string().trim().max(500).default(""),
  adminNotes: z.string().trim().max(4000).default("")
});

/**
 * A landlord or roommate who is not a Roomi user.
 *
 * Almost nobody in these posts has an account, so the admin creates a public
 * profile for them with a display name and whatever contacts the post carried.
 * No e-mail, no password, no auth record — it is a profile row, nothing more.
 */
export const temporaryHostSchema = contactMethodsSchema.extend({
  displayName: z.string().trim().min(2, "Enter a display name").max(120),
  photoURL: z.string().trim().url("Photo must be a valid URL").or(z.literal("")).default("")
});

export type TemporaryHostInput = z.infer<typeof temporaryHostSchema>;

const optionalUrl = z.string().trim().url("Photo must be a valid URL");

/** Free-text city/date fields: absent is allowed, malformed is not. */
const optionalIsoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Enter a valid date")
  .default("");

export const adminQuickListingSchema = z.object({
  // --- the four that actually matter --------------------------------------
  title: z.string().trim().min(3, "Enter a title").max(140),
  description: z.string().trim().min(10, "Paste the post text").max(4000),
  monthlyRent: z.number().int().min(0).max(MAX_MONTHLY_RENT),
  city: z.string().trim().min(1, "Select a city"),

  // --- everything else ------------------------------------------------------
  propertyType: z.enum(["apartment", "house", "dorm", "studio"]).default("apartment"),
  listingType: z.enum(["private_room", "shared_room", "entire_place"]).default("private_room"),
  district: z.string().trim().max(120).default(""),
  address: z.string().trim().max(300).default(""),
  university: z.string().trim().max(160).default(""),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  bedrooms: z.number().int().min(0).max(20).default(1),
  bathrooms: z.number().min(0).max(20).default(1),
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().int().min(0).default(0),
  availableFrom: optionalIsoDate,
  amenities: z.array(z.string()).max(20).default([]),
  genderPreference: z.enum(["any", "male", "female"]).default("any"),
  smoking: z.enum(["no", "yes"]).default("no"),
  pets: z.enum(["no_pets", "allowed"]).default("no_pets"),
  photoUrls: z.array(optionalUrl).max(10).default([]),

  // --- who it is published as ---------------------------------------------
  // Exactly one of: an existing profile (`ownerId`), or a new lightweight
  // profile created from `host`. Both absent files it under the admin's own
  // account, which the UI warns about.
  ownerId: z.string().trim().min(1).optional(),
  host: temporaryHostSchema.optional(),

  // --- workflow -------------------------------------------------------------
  publish: z.boolean().default(true),
  ignoreDuplicates: z.boolean().default(false),
  source: adminSourceSchema.partial().optional()
});

export type AdminQuickListingInput = z.infer<typeof adminQuickListingSchema>;

export const adminQuickRoommateSchema = contactMethodsSchema.extend({
  // --- the three that actually matter -------------------------------------
  fullName: z.string().trim().min(2, "Enter a name").max(120),
  bio: z.string().trim().min(10, "Paste the post text").max(4000),
  maxBudget: z.number().int().min(0).max(MAX_MONTHLY_RENT),

  // --- everything else ------------------------------------------------------
  // Age 0 means "not stated": the profile card and listing sidebar already
  // treat a falsy age that way and show a neutral label instead of "0 years".
  age: z.number().int().min(0).max(80).default(0),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).default("prefer_not_to_say"),
  university: z.string().trim().max(160).default(""),
  occupation: z.string().trim().max(120).default(""),
  city: z.string().trim().max(120).default(""),
  minBudget: z.number().int().min(0).max(MAX_MONTHLY_RENT).default(0),
  preferredMoveInDate: optionalIsoDate,
  photoURL: z.string().trim().url("Photo must be a valid URL").or(z.literal("")).default(""),
  lifestyle: z
    .object({
      smoking: z.enum(["no", "yes", "outside", "no_preference"]).default("no_preference"),
      pets: z.enum(["no_pets", "pet_friendly", "has_pets", "no_preference"]).default("no_preference"),
      cleanliness: z.enum(["relaxed", "moderate", "very_clean"]).default("moderate"),
      sleepSchedule: z.enum(["early_bird", "balanced", "night_owl"]).default("balanced"),
      guests: z.enum(["rarely", "sometimes", "often"]).default("sometimes")
    })
    .default({
      smoking: "no_preference",
      pets: "no_preference",
      cleanliness: "moderate",
      sleepSchedule: "balanced",
      guests: "sometimes"
    }),

  source: adminSourceSchema.partial().optional()
});

export type AdminQuickRoommateInput = z.infer<typeof adminQuickRoommateSchema>;
