import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/error-response";
import { revalidatePublic } from "@/lib/api/revalidate";
import { mapListingRow } from "@/lib/supabase/mappers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/supabase/session";

/**
 * Duplicates one of the caller's own listings.
 *
 * The copy is created as a DRAFT (`removed: true`, the flag this schema uses for
 * "saved but hidden"). Publishing an identical second listing the moment someone
 * clicks Duplicate would put a copy in front of renters before its owner has
 * changed the one thing they duplicated it to change.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: source, error: readError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!source || (source as { owner_id?: string }).owner_id !== user.id) {
      throw new Error("Forbidden");
    }

    // Copy the content, never the identity or the history: a fresh id and
    // timestamps, and moderation state reset so a previously approved listing
    // cannot smuggle its approval onto edited content.
    // Identity, history and moderation state are dropped by name rather than by
    // destructuring-and-ignoring, which leaves unused bindings behind.
    const OMIT = new Set(["id", "created_at", "updated_at", "removed_at", "status", "featured"]);
    const content = Object.fromEntries(
      Object.entries(source as Record<string, unknown>).filter(([key]) => !OMIT.has(key))
    );

    const now = new Date().toISOString();
    const { data: created, error: insertError } = await supabase
      .from("listings")
      .insert({
        ...content,
        owner_id: user.id,
        title: `${String(content.title ?? "").slice(0, 130)} (copy)`,
        status: "approved",
        removed: true,
        archived: false,
        created_at: now,
        updated_at: now
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    revalidatePublic("listings");
    return NextResponse.json({ listing: mapListingRow(created as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
