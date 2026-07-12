import { z } from "zod";

import { imageReference } from "@/lib/validations/shared";

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
  imageUrl: imageReference,
  logoUrl: imageReference,
  coverImageUrl: imageReference,
  position: z.number().int().min(0).max(999).optional().default(0),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
  featuredPosition: z.number().int().min(0).nullable().optional(),
  // Optional admin overrides for the two hub-card digits. null = use the live
  // computed count. Kept out of `.default()` so they're only sent when set.
  listingsCountOverride: z.number().int().min(0).max(9_999_999).nullable().optional(),
  studentsCountOverride: z.number().int().min(0).max(9_999_999).nullable().optional()
});

export const universityUpdateSchema = universityCreateSchema.partial();

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
