import { z } from "zod";

// Field validators WITHOUT defaults (see university.schema.ts: Zod 4's
// `.partial()` keeps `.default()`, which injected phantom values into PATCH
// payloads and reset columns the admin never touched).
const categoryFields = {
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80),
  icon: z.string().trim().max(60),
  position: z.number().int().min(0).max(999),
  active: z.boolean()
};

export const categoryCreateSchema = z.object({
  name: categoryFields.name,
  slug: categoryFields.slug.optional().default(""),
  icon: categoryFields.icon.optional().default(""),
  position: categoryFields.position.optional().default(0),
  active: categoryFields.active.optional().default(true)
});

// True partial update: absent keys stay absent.
export const categoryUpdateSchema = z.object({
  name: categoryFields.name.optional(),
  slug: categoryFields.slug.optional(),
  icon: categoryFields.icon.optional(),
  position: categoryFields.position.optional(),
  active: categoryFields.active.optional()
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
