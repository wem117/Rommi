import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api/error-response";
import { consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { revalidatePublic } from "@/lib/api/revalidate";
import { deleteListingPhotos } from "@/lib/data/listing-storage";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/supabase/session";

/**
 * Owner-scoped listing actions for the "My Listings" page.
 *
 * NOT admin functionality. Every handler loads the row first and refuses unless
 * `owner_id` matches the session user, so the service-role client below can only
 * ever act on something the caller already owns.
 *
 * The service-role client is required, not a convenience: `archived`, `removed`
 * and `status` are deliberately outside the authenticated column grants
 * (20240101000400) because they are moderation state — granting a user write
 * access to `status` would let anyone self-approve a rejected listing. Ownership
 * is therefore proven here, in code, and the privileged write happens after.
 */

/** Loads the listing and refuses unless the caller owns it. */
async function requireOwnedListing(id: string) {
  const user = await requireSessionUser();
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("listings")
    .select("id, owner_id, photo_urls, archived")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  // Same response for "does not exist" and "belongs to someone else": telling
  // the difference would confirm the existence of another user's listing.
  if (!data || data.owner_id !== user.id) throw new Error("Forbidden");

  return { user, supabase, listing: data as { id: string; owner_id: string; photo_urls: string[] | null; archived: boolean } };
}

const patchSchema = z.object({ archived: z.boolean() });

/** Archive / unarchive. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireOwnedListing(id);
    // Per user rather than per IP: the caller is authenticated, so the account
    // is the thing to limit. Each call revalidates the public cache, which is
    // the cost worth bounding here.
    if (!(await consume(`my-listings-write:${user.id}`, 60, 60_000))) return rateLimitResponse();
    const input = patchSchema.parse(await request.json());

    const { error } = await supabase
      .from("listings")
      .update({ archived: input.archived, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    revalidatePublic("listings");
    return NextResponse.json({ ok: true, archived: input.archived });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Permanently deletes the listing and its photos. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, listing, user } = await requireOwnedListing(id);
    if (!(await consume(`my-listings-write:${user.id}`, 60, 60_000))) return rateLimitResponse();

    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) throw error;

    // After the row is gone, so a storage failure cannot leave a listing that
    // reports "deleted" but still exists.
    const removed = await deleteListingPhotos(listing.photo_urls ?? []);

    revalidatePublic("listings");
    return NextResponse.json({ ok: true, photosRemoved: removed });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
