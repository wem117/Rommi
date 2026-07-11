import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional().default(""),
  icon: z.string().trim().max(60).optional().default(""),
  position: z.number().int().min(0).max(999).optional().default(0),
  active: z.boolean().optional().default(true)
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
