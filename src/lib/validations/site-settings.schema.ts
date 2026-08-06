import { z } from "zod";

import { imageReference } from "@/lib/validations/shared";

const localizedHeroSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  subtitle: z.string().trim().max(400).optional().default("")
});

export const homepageHeroSchema = z.object({
  en: localizedHeroSchema.optional(),
  ru: localizedHeroSchema.optional(),
  kz: localizedHeroSchema.optional(),
  imageUrl: imageReference.optional().default("")
});

export const homepageSectionSchema = z.object({
  key: z.string(),
  visible: z.boolean()
});

const platformSettingsSchema = z.object({
  siteName: z.string().trim().max(80).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  faviconUrl: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(60).optional(),
  socialLinks: z
    .object({
      instagram: z.string().trim().max(300).optional(),
      telegram: z.string().trim().max(300).optional(),
      whatsapp: z.string().trim().max(300).optional(),
      facebook: z.string().trim().max(300).optional()
    })
    .optional(),
  footerText: z.string().trim().max(300).optional(),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(400).optional(),
  // Empty string clears the setting (Analytics stays off); a non-empty value
  // must be a real GA4 measurement ID. The root layout re-validates this same
  // shape before rendering the tag, but rejecting a malformed ID here gives
  // the admin an immediate, clear error instead of a silently-inert save.
  analyticsGaId: z
    .string()
    .trim()
    .max(60)
    .refine((value) => value === "" || /^G-[A-Z0-9]{4,}$/i.test(value), {
      message: "Google Analytics ID must look like G-XXXXXXXXXX, or be left empty to disable Analytics."
    })
    .optional(),
  defaultLanguage: z.enum(["en", "ru", "kz"]).optional()
});

/**
 * Homepage statistics are an admin-owned LIST, so a new figure is a row rather
 * than a release. Each metric carries its own labels and says where its number
 * comes from: `manual` renders exactly what was typed, a live source renders a
 * real database count plus an offset.
 */
const statMetricSchema = z.object({
  key: z.string().trim().min(1).max(40),
  labels: z.object({
    en: z.string().trim().max(60),
    ru: z.string().trim().max(60),
    kz: z.string().trim().max(60)
  }),
  source: z.enum(["manual", "listings", "students", "matches"]),
  value: z.number().int().min(0).max(100_000_000),
  suffix: z.string().trim().max(4),
  visible: z.boolean()
});

const homepageStatsSchema = z.object({
  // A cap, not a design limit: twelve figures is already more than a homepage
  // strip can carry, and an unbounded array is an unbounded page.
  metrics: z.array(statMetricSchema).max(12)
});

/**
 * Automatic publishing of Telegram imports.
 *
 * Lives in settings rather than in an env var precisely because it is the kind
 * of switch someone wants to throw at 2am without a deploy — usually off,
 * after seeing something they did not like.
 */
export const telegramPublishSchema = z.object({
  enabled: z.boolean().default(false),
  // 0-100. The worker holds anything below this for review.
  minConfidence: z.number().int().min(0).max(100).default(75),
  requirePhotos: z.boolean().default(false)
});

export const siteSettingsUpdateSchema = z.object({
  telegramPublish: telegramPublishSchema.optional(),
  featuredListingsLimit: z.number().int().min(1).max(50).optional(),
  featuredRoommatesLimit: z.number().int().min(1).max(50).optional(),
  maintenanceMode: z.boolean().optional(),
  adminEmails: z.array(z.string().trim().email()).max(20).optional(),
  homepageHero: homepageHeroSchema.optional(),
  homepageSections: z.array(homepageSectionSchema).optional(),
  homepageStats: homepageStatsSchema.optional(),
  platform: platformSettingsSchema.optional()
});

export type SiteSettingsUpdateInput = z.infer<typeof siteSettingsUpdateSchema>;
export type HomepageHero = z.infer<typeof homepageHeroSchema>;
export type HomepageSection = z.infer<typeof homepageSectionSchema>;
