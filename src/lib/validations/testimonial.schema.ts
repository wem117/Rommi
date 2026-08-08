import { z } from "zod";

import { imageReference } from "@/lib/validations/shared";

// Field validators WITHOUT defaults (see university.schema.ts: Zod 4's
// `.partial()` keeps `.default()`, which injected phantom values into PATCH
// payloads and reset columns the admin never touched).
const testimonialFields = {
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().max(120),
  quote: z.string().trim().min(1).max(600),
  imageUrl: imageReference,
  badge: z.string().trim().max(60),
  // Coerced: the admin form sends a string from a number input.
  rating: z.coerce.number().int().min(1).max(5),
  position: z.number().int().min(0).max(999),
  active: z.boolean()
};

export const testimonialCreateSchema = z.object({
  name: testimonialFields.name,
  role: testimonialFields.role.optional().default(""),
  quote: testimonialFields.quote,
  imageUrl: testimonialFields.imageUrl.optional().default(""),
  badge: testimonialFields.badge.optional().default(""),
  rating: testimonialFields.rating.optional().default(5),
  position: testimonialFields.position.optional().default(0),
  active: testimonialFields.active.optional().default(true)
});

// True partial update: absent keys stay absent.
export const testimonialUpdateSchema = z.object({
  name: testimonialFields.name.optional(),
  role: testimonialFields.role.optional(),
  quote: testimonialFields.quote.optional(),
  imageUrl: testimonialFields.imageUrl.optional(),
  badge: testimonialFields.badge.optional(),
  rating: testimonialFields.rating.optional(),
  position: testimonialFields.position.optional(),
  active: testimonialFields.active.optional()
});

export type TestimonialCreateInput = z.infer<typeof testimonialCreateSchema>;
export type TestimonialUpdateInput = z.infer<typeof testimonialUpdateSchema>;
