"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { deleteImageByUrl, storagePathForImage, uploadImageFile, validateImageFile } from "@/lib/supabase/storage";

const MAX_LISTING_IMAGES = 10;

export function PhotoUploader({
  ownerId,
  value,
  onChange
}: {
  ownerId: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;

    const selected = Array.from(files);
    if (value.length + selected.length > MAX_LISTING_IMAGES) {
      toast.error("Listings can have up to 10 images");
      return;
    }

    const invalid = selected.map(validateImageFile).find(Boolean);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const urls: string[] = [];
      for (const file of selected) {
        const url = await uploadImageFile({
          file,
          path: storagePathForImage("listings", ownerId, file),
          onProgress: setProgress
        });
        urls.push(url);
      }
      onChange([...value, ...urls]);
    } catch (error) {
      console.error(error);
      toast.error("Could not upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto(url: string) {
    onChange(value.filter((item) => item !== url));
    await deleteImageByUrl(url).catch(() => undefined);
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <label>Photos</label>
          <p className="mt-1 text-xs text-foreground/55">JPG, JPEG, PNG, WEBP. Max 5 MB each, 10 images total.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void uploadFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || value.length >= MAX_LISTING_IMAGES}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? `${progress}%` : "Add photos"}
        </button>
      </div>

      {value.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {value.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl bg-background">
              <Image src={url} alt="Listing photo" fill className="object-cover" sizes="160px" />
              <button
                type="button"
                onClick={() => void removePhoto(url)}
                className="absolute right-2 top-2 rounded-full bg-white p-2 text-red-700 shadow-soft"
                aria-label="Remove photo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-foreground/55">
          Add at least one clear photo to make your listing easier to trust.
        </div>
      )}
    </div>
  );
}
