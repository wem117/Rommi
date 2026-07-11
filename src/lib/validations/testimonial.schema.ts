import { z } from "zod";

export const testimonialCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().max(120).optional().default(""),
  quote: z.string().trim().min(1).max(600),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  badge: z.string().trim().max(60).optional().default(""),
  position: z.number().int().min(0).max(999).optional().default(0),
  active: z.boolean().optional().default(true)
});

export const testimonialUpdateSchema = testimonialCreateSchema.partial();

export type TestimonialCreateInput = z.infer<typeof testimonialCreateSchema>;
export type TestimonialUpdateInput = z.infer<typeof testimonialUpdateSchema>;
