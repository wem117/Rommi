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
  price: z.number().int().min(0).max(MAX_MONTHLY_RENT).optional(),
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
  status: z.enum(["draft", "pending_review"]).optional()
});

export type TelegramImportUpdateInput = z.infer<typeof telegramImportUpdateSchema>;

/**
 * What Approve requires, on top of whatever is already saved on the row: a
 * map pin. Mirrors adminQuickListingSchema's own publish-time refine (lat/lng
 * required to publish) so a Telegram import is held to the exact same bar as
 * a manually pasted listing before it goes live.
 */
export const telegramImportApproveSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  university: z.string().trim().max(160).optional().default("")
});

export type TelegramImportApproveInput = z.infer<typeof telegramImportApproveSchema>;
