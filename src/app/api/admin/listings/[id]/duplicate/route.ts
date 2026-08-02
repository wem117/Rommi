import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { getListingAdminMeta, upsertListingAdminMeta } from "@/lib/data/listing-admin-meta";
import { requireAdminUser } from "@/lib/supabase/admin";
import { mapListingRow } from "@/lib/supabase/mappers";

/**
 * Copies a listing.
 *
 * The same landlord routinely advertises several near-identical rooms in one
 * building, and re-entering a twenty-field listing to change the floor is the
 * slowest thing in the admin. The copy keeps the original's owner, so it is the
 * same public host, and its provenance, so "where did this come from" still
 * answers correctly.
 *
 * The copy is always created HIDDEN (`removed: true`), never published:
 * duplicating is the start of an edit, and a verbatim second copy of a live
 * listing appearing in browse is exactly what nobody wants. It is also excluded
 * from featured placement and reset to `pending` moderation for the same
 * reason — a copy has not been reviewed.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAdminUser();

    const { data: source, error: readError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!source) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    // Everything except identity, placement and audit columns is copied; the
    // dropped keys are all re-set explicitly below.
    const copyable = { ...(source as Record<string, unknown>) };
    for (const key of ["id", "created_at", "updated_at", "removed_at", "featured", "featured_position", "status"]) {
      delete copyable[key];
    }

    const now = new Date().toISOString();
    const { data: created, error: insertError } = await supabase
      .from("listings")
      .insert({
        ...copyable,
        title: `${String(source.title ?? "").slice(0, 120)} (copy)`,
        removed: true,
        removed_at: now,
        featured: false,
        featured_position: null,
        status: "pending",
        created_at: now,
        updated_at: now
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    // Provenance travels with the copy: it came from the same original advert.
    const meta = await getListingAdminMeta(id);
    if (meta) await upsertListingAdminMeta(created.id as string, meta);

    return NextResponse.json({ listing: mapListingRow(created) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
