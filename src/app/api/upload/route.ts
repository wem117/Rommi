import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { consume, rateLimitResponse } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireAdminUser } from "@/lib/supabase/admin";
import { requireSessionUser } from "@/lib/supabase/session";
import { MAX_IMAGE_SIZE, IMAGE_TYPES } from "@/lib/supabase/storage";
import { friendlySupabaseError, isMissingSupabaseTable } from "@/lib/utils/errors";
import { verifyImageContent, type DetectedImageType } from "@/lib/utils/file-signature";

// Extension is derived from the VERIFIED content type, never from the
// client-supplied filename/MIME, so a spoofed extension can't be persisted.
const EXTENSION_BY_TYPE: Record<DetectedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const deleteSchema = z.object({
  path: z.string().min(1)
});

const ADMIN_UPLOAD_KIND = "admin";

/** The per-user folders POST can ever write to. `admin/` is deliberately absent. */
const OWNED_UPLOAD_KINDS = ["avatars", "listings", "messages"] as const;

/**
 * Is `path` an object this user owns?
 *
 * POST composes every key as `${kind}/${user.id}/${randomUUID()}.${ext}` — no
 * client input reaches it — so ownership is decidable from the key alone. DELETE
 * takes the key from the request body, which makes this the only thing standing
 * between a caller and a service-role `remove()`.
 *
 * The previous check accepted any path merely CONTAINING `/${user.id}/`
 * anywhere. For literal storage keys that is not exploitable — a key holding the
 * attacker's own uid segment is by definition their own object — but it sits one
 * backend behaviour away from being so: a storage layer that normalises `..`
 * would resolve `listings/<attacker>/../<victim>/x.jpg` onto the victim's object
 * while the substring test happily passed it. A strict prefix match does not
 * depend on that assumption, and `..`/backslashes are refused outright rather
 * than reasoned about.
 */
export function isOwnedUploadPath(path: string, userId: string): boolean {
  if (!userId) return false;
  if (path.includes("..") || path.includes("\\")) return false;
  if (path.startsWith("/")) return false;
  return OWNED_UPLOAD_KINDS.some((kind) => path.startsWith(`${kind}/${userId}/`));
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Select an image to upload." }, { status: 400 });
    }

    if (kind !== "avatars" && kind !== "listings" && kind !== "messages" && kind !== ADMIN_UPLOAD_KIND) {
      return NextResponse.json({ error: "Upload kind is invalid." }, { status: 400 });
    }

    // Admin-managed content (universities, testimonials, homepage assets) isn't
    // scoped to a single user's folder, so it requires admin access instead.
    const user = kind === ADMIN_UPLOAD_KIND ? (await requireAdminUser()).user : await requireSessionUser();

    // Per-user throttle: 30 uploads/hour caps storage abuse without getting
    // in the way of a listing with a full photo set.
    if (!(await consume(`upload:${user.id}`, 30, 60 * 60_000))) return rateLimitResponse();

    if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
      return NextResponse.json({ error: "Only JPG, JPEG, PNG, and WEBP images are allowed." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Images must be 5 MB or smaller." }, { status: 400 });
    }

    // Content-based verification: reject anything whose real bytes aren't a
    // supported raster image, regardless of the declared MIME/extension. This
    // blocks SVG-with-script and renamed-HTML payloads reaching the public bucket.
    const detectedType = await verifyImageContent(file);
    if (!detectedType) {
      return NextResponse.json(
        { error: "That file isn't a valid JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    const extension = EXTENSION_BY_TYPE[detectedType];
    const supabase = createSupabaseAdminClient();
    const path =
      kind === ADMIN_UPLOAD_KIND
        ? `admin/${randomUUID()}.${extension}`
        : `${kind}/${user.id}/${randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(supabaseConfig.storageBucket)
      .upload(path, bytes, {
        // Store the VERIFIED content type, and force download semantics off the
        // table by never trusting the client value.
        contentType: detectedType,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(path);

    // getPublicUrl builds its URL from the origin the CLIENT was constructed
    // with — and server-side clients may be pointed at an internal origin
    // (SUPABASE_INTERNAL_URL, e.g. http://kong:8000) to keep database traffic
    // off the public internet. That origin is unreachable from a browser, so
    // persisting it here would write permanently broken image links into the
    // database. Re-anchor to the public origin, which is what the browser must
    // eventually load.
    const publicUrl =
      supabaseConfig.serverUrl && supabaseConfig.serverUrl !== supabaseConfig.url
        ? publicData.publicUrl.replace(supabaseConfig.serverUrl, supabaseConfig.url)
        : publicData.publicUrl;

    const metadata = {
      owner_id: user.id,
      bucket: supabaseConfig.storageBucket,
      path,
      public_url: publicUrl,
      kind,
      is_public: true,
      created_at: new Date().toISOString()
    };

    const { data: imageRow, error: insertError } = await supabase
      .from("images")
      .insert(metadata)
      .select("*")
      .single();

    if (insertError) {
      if (isMissingSupabaseTable(insertError, "images")) {
        return NextResponse.json({
          url: publicUrl,
          path,
          image: null,
          warning: "The image metadata table is missing, so the file was uploaded without a database record."
        });
      }

      await supabase.storage.from(supabaseConfig.storageBucket).remove([path]).catch(() => undefined);
      throw insertError;
    }

    return NextResponse.json({
      url: publicUrl,
      path,
      image: imageRow
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json(
      { error: friendlySupabaseError(error, "Could not upload image. Please try again.") },
      { status }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSessionUser();
    // Deletion was the one upload verb with no throttle, so a single account
    // could drive service-role removes unbounded.
    if (!(await consume(`upload-delete:${user.id}`, 60, 60 * 60_000))) return rateLimitResponse();
    const { path } = deleteSchema.parse(await request.json());

    if (!isOwnedUploadPath(path, user.id)) {
      return NextResponse.json({ error: "You can only delete your own uploads." }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(supabaseConfig.storageBucket).remove([path]);
    if (error) throw error;

    await supabase.from("images").delete().eq("path", path).eq("owner_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json(
      { error: friendlySupabaseError(error, "Could not delete image.") },
      { status }
    );
  }
}
