import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { deleteUserAccount, requireAdminUser } from "@/lib/supabase/admin";

const adminProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  university: z.string().trim().max(160).optional(),
  occupation: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  role: z.enum(["user", ADMIN_ROLE]).optional(),
  verified: z.boolean().optional(),
  banned: z.boolean().optional(),
  suspended: z.boolean().optional(),
  roommateStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  featured: z.boolean().optional(),
  featuredPosition: z.number().int().min(0).nullable().optional(),
  contactsHidden: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();
    const input = adminProfileUpdateSchema.parse(await request.json());

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.fullName !== undefined) payload.full_name = input.fullName;
    if (input.email !== undefined) payload.email = input.email || null;
    if (input.university !== undefined) payload.university = input.university;
    if (input.occupation !== undefined) payload.occupation = input.occupation;
    if (input.bio !== undefined) payload.bio = input.bio;
    if (input.role !== undefined) payload.role = input.role;
    if (input.verified !== undefined) {
      payload.verified = input.verified;
      payload.verified_at = input.verified ? new Date().toISOString() : null;
    }
    if (input.banned !== undefined) {
      payload.banned = input.banned;
      payload.banned_at = input.banned ? new Date().toISOString() : null;
    }
    if (input.suspended !== undefined) {
      payload.suspended = input.suspended;
      payload.suspended_at = input.suspended ? new Date().toISOString() : null;
    }
    if (input.roommateStatus !== undefined) payload.roommate_status = input.roommateStatus;
    if (input.featured !== undefined) payload.featured = input.featured;
    if (input.featuredPosition !== undefined) payload.featured_position = input.featuredPosition;
    if (input.contactsHidden !== undefined) payload.contacts_hidden = input.contactsHidden;

    const { data, error } = await supabase.from("profiles").update(payload).eq("uid", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ user: mapProfileRow(data) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdminUser();
    await deleteUserAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
