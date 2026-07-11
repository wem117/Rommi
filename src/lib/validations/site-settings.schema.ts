import { z } from "zod";

const localizedHeroSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  subtitle: z.string().trim().max(400).optional().default("")
});

export const homepageHeroSchema = z.object({
  en: localizedHeroSchema.optional(),
  ru: localizedHeroSchema.optional(),
  kz: localizedHeroSchema.optional(),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default("")
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
  analyticsGaId: z.string().trim().max(60).optional(),
  defaultLanguage: z.enum(["en", "ru", "kz"]).optional()
});

const statMetricSchema = z.object({
  base: z.number().int().min(0).max(100_000_000),
  growthMin: z.number().int().min(0).max(100_000),
  growthMax: z.number().int().min(0).max(100_000)
});

const homepageStatsSchema = z.object({
  startDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  listings: statMetricSchema,
  students: statMetricSchema,
  matches: statMetricSchema
});

export const siteSettingsUpdateSchema = z.object({
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
