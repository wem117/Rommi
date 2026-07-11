"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useLocale } from "@/context/locale-context";
import { deleteImageByUrl, uploadImageFile, validateImageFile } from "@/lib/supabase/storage";
import { friendlySupabaseError } from "@/lib/utils/errors";

export function AvatarUpload({
  value,
  name,
  onChange
}: {
  value?: string | null;
  name: string;
  onChange: (url: string | null) => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;

    const validation = validateImageFile(file);
    if (validation) {
      toast.error(validation);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadImageFile({
        file,
        kind: "avatars",
        onProgress: setProgress
      });
      if (value) await deleteImageByUrl(value).catch(() => undefined);
      onChange(result.url);
    } catch (error) {
      console.error(error);
      toast.error(friendlySupabaseError(error, t("shared.avatarUploadFailed")));
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (value) await deleteImageByUrl(value).catch(() => undefined);
    onChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-background ring-1 ring-border">
        {value ? (
          <Image src={value} alt={name} fill className="object-cover" sizes="112px" />
        ) : (
          <div className="grid h-full place-items-center text-3xl font-bold text-primary">
            {name.slice(0, 1).toUpperCase() || "R"}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {uploading ? `${progress}%` : t("shared.uploadButton")}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => void removeAvatar()}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            {t("shared.removeButton")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
