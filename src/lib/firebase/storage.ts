import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot
} from "firebase/storage";

import { storage } from "@/lib/firebase/client";

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
  onProgress?: (progress: number, snapshot: UploadTaskSnapshot) => void;
}) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const imageRef = ref(storage, path);
  const task = uploadBytesResumable(imageRef, file, { contentType: file.type });

  return new Promise<string>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(progress, snapshot);
      },
      reject,
      async () => {
        resolve(await getDownloadURL(task.snapshot.ref));
      }
    );
  });
}

export async function deleteImageByUrl(url: string) {
  if (!url.includes("firebasestorage.googleapis.com")) return;
  await deleteObject(ref(storage, url));
}
