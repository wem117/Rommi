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

export const siteSettingsUpdateSchema = z.object({
  featuredListingsLimit: z.number().int().min(1).max(50).optional(),
  featuredRoommatesLimit: z.number().int().min(1).max(50).optional(),
  maintenanceMode: z.boolean().optional(),
  adminEmails: z.array(z.string().trim().email()).max(20).optional(),
  homepageHero: homepageHeroSchema.optional(),
  homepageSections: z.array(homepageSectionSchema).optional()
});

export type SiteSettingsUpdateInput = z.infer<typeof siteSettingsUpdateSchema>;
export type HomepageHero = z.infer<typeof homepageHeroSchema>;
export type HomepageSection = z.infer<typeof homepageSectionSchema>;
