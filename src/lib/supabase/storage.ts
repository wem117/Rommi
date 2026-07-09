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

export function storagePathForImage(kind: "avatars" | "listings" | "messages", ownerId: string, file: File) {
  const fallback = file.type.split("/")[1] || "jpg";
  const extension = file.name.split(".").pop()?.toLowerCase() || fallback;
  return `${kind}/${ownerId}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadImageFile({
  file,
  kind,
  onProgress
}: {
  file: File;
  kind: "avatars" | "listings" | "messages";
  onProgress?: (progress: number) => void;
}) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  if (!isSupabaseConfigured) throw new Error("Supabase storage is not configured");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  return new Promise<{ url: string; path: string; image?: Record<string, unknown> | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      let payload: { url?: string; path?: string; image?: Record<string, unknown> | null; error?: string } = {};

      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        payload = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.url && payload.path) {
        onProgress?.(100);
        resolve({
          url: payload.url,
          path: payload.path,
          image: payload.image ?? null
        });
        return;
      }

      reject(new Error(payload.error || "Could not upload image"));
    };

    xhr.onerror = () => reject(new Error("Network request failed while uploading image"));
    xhr.send(formData);
  });
}

export async function deleteImageByUrl(url: string) {
  if (!isSupabaseConfigured || !url.includes(supabaseConfig.storageBucket)) return;

  const marker = `/${supabaseConfig.storageBucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  const path = url.slice(index + marker.length);
  const response = await fetch("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });

  if (!response.ok) {
    throw new Error("Could not delete image");
  }
}
