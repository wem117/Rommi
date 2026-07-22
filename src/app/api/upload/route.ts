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

function fileExtension(file: File) {
  const fallback = file.type.split("/")[1] || "jpg";
  return file.name.split(".").pop()?.toLowerCase() || fallback;
}

const deleteSchema = z.object({
  path: z.string().min(1)
});

const ADMIN_UPLOAD_KIND = "admin";

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
    if (!consume(`upload:${user.id}`, 30, 60 * 60_000)) return rateLimitResponse();

    if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
      return NextResponse.json({ error: "Only JPG, JPEG, PNG, and WEBP images are allowed." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Images must be 5 MB or smaller." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const path =
      kind === ADMIN_UPLOAD_KIND
        ? `admin/${randomUUID()}.${fileExtension(file)}`
        : `${kind}/${user.id}/${randomUUID()}.${fileExtension(file)}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(supabaseConfig.storageBucket)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(path);
    const metadata = {
      owner_id: user.id,
      bucket: supabaseConfig.storageBucket,
      path,
      public_url: publicData.publicUrl,
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
          url: publicData.publicUrl,
          path,
          image: null,
          warning: "The image metadata table is missing, so the file was uploaded without a database record."
        });
      }

      await supabase.storage.from(supabaseConfig.storageBucket).remove([path]).catch(() => undefined);
      throw insertError;
    }

    return NextResponse.json({
      url: publicData.publicUrl,
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
    const { path } = deleteSchema.parse(await request.json());

    if (
      !path.includes(`/${user.id}/`) &&
      !path.startsWith(`avatars/${user.id}/`) &&
      !path.startsWith(`listings/${user.id}/`) &&
      !path.startsWith(`messages/${user.id}/`)
    ) {
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
