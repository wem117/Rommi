import { z } from "zod";

import { ADMIN_ROLE } from "@/lib/auth/admin-access";

export const banUserSchema = z.object({
  userId: z.string().min(1),
  ban: z.boolean()
});

export const verifyUserSchema = z.object({
  userId: z.string().min(1),
  verify: z.boolean()
});

export const userDeleteSchema = z.object({
  userId: z.string().min(1)
});

export const userUpdateSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  university: z.string().trim().max(160).optional(),
  occupation: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  role: z.enum(["user", ADMIN_ROLE]).optional()
});

export const listingActionSchema = z.object({
  listingId: z.string().min(1),
  action: z.enum(["remove", "restore"])
});

export const listingModerationSchema = z.object({
  listingId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"])
});

export const listingUpdateSchema = z.object({
  title: z.string().trim().min(8).max(100).optional(),
  description: z.string().trim().min(30).max(2000).optional(),
  monthlyRent: z.number().int().min(0).optional(),
  city: z.string().trim().min(1).optional(),
  district: z.string().trim().optional(),
  address: z.string().trim().min(5).optional()
});

export const featureSchema = z.object({
  id: z.string().min(1),
  featured: z.boolean(),
  featuredPosition: z.number().int().min(0).nullable().optional()
});

export const roommateModerationSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"])
});

export const reportCreateSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["user", "listing"]),
  reason: z.string().min(5),
  details: z.string().optional()
});

export const reportUpdateSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["open", "dismissed", "resolved"]),
  note: z.string().optional()
});

export type BanUserInput = z.infer<typeof banUserSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ListingActionInput = z.infer<typeof listingActionSchema>;
export type ListingModerationInput = z.infer<typeof listingModerationSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type FeatureInput = z.infer<typeof featureSchema>;
export type RoommateModerationInput = z.infer<typeof roommateModerationSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
