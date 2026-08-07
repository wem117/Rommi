import { z } from "zod";

import { imageReference } from "@/lib/validations/shared";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Field validators WITHOUT defaults, shared by create and update. Defaults
// live only in the create schema: in Zod 4, `.partial()` does not neutralize
// `.default()`, so a `createSchema.partial()` update schema injected phantom
// values (featured=false, active=true, position=0, imageUrl="") into every
// PATCH and silently reset columns the admin never touched.
const universityFields = {
  name: z.string().trim().min(1).max(160),
  // Localised DISPLAY names. Empty means "use `name`", which is the normal case
  // — most Kazakhstani universities use their Latin name verbatim in all three
  // languages. `name` itself stays canonical because listings and profiles
  // store it as free text and the Telegram parser matches on it.
  nameRu: z.string().trim().max(160),
  nameKz: z.string().trim().max(160),
  slug: z.string().trim().max(160),
  city: z.string().trim().max(80),
  country: z.string().trim().max(80),
  /** e.g. "International branch campus" — free text; the sector has many shapes. */
  type: z.string().trim().max(120),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Enter a full URL, or leave it empty."),
  language: z.string().trim().max(80),
  description: z.string().trim().max(600),
  imageUrl: imageReference,
  logoUrl: imageReference,
  coverImageUrl: imageReference,
  position: z.number().int().min(0).max(999),
  active: z.boolean(),
  featured: z.boolean(),
  featuredPosition: z.number().int().min(0).nullable(),
  // Admin overrides for the two hub-card digits. null = use the live count.
  listingsCountOverride: z.number().int().min(0).max(9_999_999).nullable(),
  studentsCountOverride: z.number().int().min(0).max(9_999_999).nullable()
};

export const universityCreateSchema = z.object({
  name: universityFields.name,
  nameRu: universityFields.nameRu.optional().default(""),
  nameKz: universityFields.nameKz.optional().default(""),
  country: universityFields.country.optional().default("Kazakhstan"),
  type: universityFields.type.optional().default(""),
  website: universityFields.website.optional().default(""),
  language: universityFields.language.optional().default(""),
  slug: universityFields.slug.optional().default(""),
  city: universityFields.city.optional().default(""),
  description: universityFields.description.optional().default(""),
  imageUrl: universityFields.imageUrl.optional().default(""),
  logoUrl: universityFields.logoUrl.optional().default(""),
  coverImageUrl: universityFields.coverImageUrl.optional().default(""),
  position: universityFields.position.optional().default(0),
  active: universityFields.active.optional().default(true),
  featured: universityFields.featured.optional().default(false),
  featuredPosition: universityFields.featuredPosition.optional(),
  listingsCountOverride: universityFields.listingsCountOverride.optional(),
  studentsCountOverride: universityFields.studentsCountOverride.optional()
});

// True partial update: absent keys stay absent, so PATCH only ever touches
// the fields the caller explicitly sent.
export const universityUpdateSchema = z.object({
  name: universityFields.name.optional(),
  nameRu: universityFields.nameRu.optional(),
  nameKz: universityFields.nameKz.optional(),
  country: universityFields.country.optional(),
  type: universityFields.type.optional(),
  website: universityFields.website.optional(),
  language: universityFields.language.optional(),
  slug: universityFields.slug.optional(),
  city: universityFields.city.optional(),
  description: universityFields.description.optional(),
  imageUrl: universityFields.imageUrl.optional(),
  logoUrl: universityFields.logoUrl.optional(),
  coverImageUrl: universityFields.coverImageUrl.optional(),
  position: universityFields.position.optional(),
  active: universityFields.active.optional(),
  featured: universityFields.featured.optional(),
  featuredPosition: universityFields.featuredPosition.optional(),
  listingsCountOverride: universityFields.listingsCountOverride.optional(),
  studentsCountOverride: universityFields.studentsCountOverride.optional()
});

export type UniversityCreateInput = z.infer<typeof universityCreateSchema>;
export type UniversityUpdateInput = z.infer<typeof universityUpdateSchema>;

export { slugify };

// The override columns are added by a later migration. Until it's applied,
// writes that include them fail with a missing-column error; routes detect
// that and retry without these keys so existing admin editing keeps working.
export const UNIVERSITY_OVERRIDE_COLUMNS = ["listings_count_override", "students_count_override"] as const;

export function isMissingOverrideColumnError(error: unknown): boolean {
  const err = error as { code?: string; message?: string; details?: string } | null;
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  const haystack = `${err.message ?? ""} ${err.details ?? ""}`;
  return UNIVERSITY_OVERRIDE_COLUMNS.some((column) => haystack.includes(column));
}
