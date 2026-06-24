import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";

export const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    return "Only JPG, JPEG, PNG, and WEBP images are allowed.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "Images must be 5 MB or smaller.";
  }

  return null;
}

function fileExtension(file: File) {
  const fallback = file.type.split("/")[1] || "jpg";
  return file.name.split(".").pop()?.toLowerCase() || fallback;
}

export function storagePathForImage(kind: "avatars" | "listings", ownerId: string, file: File) {
  return `${kind}/${ownerId}/${crypto.randomUUID()}.${fileExtension(file)}`;
}

export async function uploadImageFile({
  file,
  path,
  onProgress
}: {
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
}) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  if (!isSupabaseConfigured) throw new Error("Supabase storage is not configured");

  const supabase = getSupabaseBrowserClient();
  onProgress?.(25);
  const { error: uploadError } = await supabase.storage
    .from(supabaseConfig.storageBucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;
  onProgress?.(100);

  const { data } = supabase.storage.from(supabaseConfig.storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImageByUrl(url: string) {
  if (!isSupabaseConfigured || !url.includes(supabaseConfig.storageBucket)) return;

  const marker = `/${supabaseConfig.storageBucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  const path = url.slice(index + marker.length);
  const supabase = getSupabaseBrowserClient();
  await supabase.storage.from(supabaseConfig.storageBucket).remove([path]);
}

