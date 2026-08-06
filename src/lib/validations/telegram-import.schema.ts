import { z } from "zod";

import { MAX_MONTHLY_RENT } from "@/lib/validations/monthly-rent";

/**
 * Editing a staged Telegram import before it is approved/rejected.
 *
 * All fields optional: the admin edits whichever the AI got wrong or left
 * blank, and a PATCH only needs to carry what changed. Approval-time
 * completeness (title/description/rent/city, plus a map pin) is enforced
 * separately by `telegramImportApproveSchema`, not here — an incomplete draft
 * must still be saveable.
 */
export const telegramImportUpdateSchema = z.object({
  title: z.string().trim().max(140).optional(),
  description: z.string().trim().max(4000).optional(),
  city: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  // Nullable, and null is meaningful: "the post stated no price". Storing 0
  // would render as "0 ₸", which is a wrong number rather than a missing one.
  price: z.number().int().min(0).max(MAX_MONTHLY_RENT).nullable().optional(),
  currency: z.string().trim().max(8).optional(),
  rooms: z.number().int().min(0).max(20).nullable().optional(),
  propertyType: z.enum(["apartment", "house", "dorm", "studio"]).nullable().optional(),
  area: z.number().min(0).max(2000).nullable().optional(),
  floor: z.number().int().min(0).max(200).nullable().optional(),
  totalFloors: z.number().int().min(0).max(200).nullable().optional(),
  amenities: z.array(z.string().trim().max(60)).max(20).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactTelegram: z.string().trim().max(120).optional(),
  contactWhatsapp: z.string().trim().max(40).optional(),
  photoUrls: z.array(z.string().trim().url()).max(10).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  // Fields the deterministic parser fills in and the admin corrects.
  zhk: z.string().trim().max(120).optional(),
  university: z.string().trim().max(160).optional(),
  capacity: z.number().int().min(0).max(20).nullable().optional(),
  depositAmount: z.number().int().min(0).max(MAX_MONTHLY_RENT).nullable().optional(),
  depositRequired: z.boolean().nullable().optional(),
  utilitiesIncluded: z.boolean().nullable().optional(),
  status: z.enum(["draft", "pending_review"]).optional()
});

export type TelegramImportUpdateInput = z.infer<typeof telegramImportUpdateSchema>;

/**
 * What Approve may carry, on top of whatever is already saved on the row.
 *
 * Coordinates are OPTIONAL. They used to be mandatory, which sounded like
 * rigour and behaved like an obstacle: most Telegram posts give a ЖК or a
 * landmark and no street, so requiring a pin meant an admin guessing at a
 * location on the map purely to clear a validation rule — inventing data to
 * satisfy a check. A listing with no pin simply renders without a map (see
 * `hasCoordinates` in the listing page), which is the honest presentation of
 * "we do not know exactly where this is".
 */
export const telegramImportApproveSchema = z.object({
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  university: z.string().trim().max(160).optional().default("")
});

export type TelegramImportApproveInput = z.infer<typeof telegramImportApproveSchema>;
