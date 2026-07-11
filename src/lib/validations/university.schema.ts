import { z } from "zod";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const universityCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(600).optional().default(""),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  logoUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  coverImageUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  position: z.number().int().min(0).max(999).optional().default(0),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  featuredPosition: z.number().int().min(0).nullable().optional()
});

export const universityUpdateSchema = universityCreateSchema.partial();

export type UniversityCreateInput = z.infer<typeof universityCreateSchema>;
export type UniversityUpdateInput = z.infer<typeof universityUpdateSchema>;

export { slugify };
