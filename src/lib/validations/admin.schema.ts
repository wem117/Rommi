import { z } from "zod";

export const banUserSchema = z.object({
  userId: z.string().min(1),
  ban: z.boolean()
});

export const verifyUserSchema = z.object({
  userId: z.string().min(1),
  verify: z.boolean()
});

export const listingActionSchema = z.object({
  listingId: z.string().min(1),
  action: z.enum(["remove", "restore"])
});

export const reportCreateSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["user", "listing"]),
  reason: z.string().min(5),
  details: z.string().optional()
});

export const reportUpdateSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["open", "dismissed", "action_taken"]),
  note: z.string().optional()
});

export type BanUserInput = z.infer<typeof banUserSchema>;
export type ListingActionInput = z.infer<typeof listingActionSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
