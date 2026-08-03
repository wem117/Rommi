"use client";

import { MultiImageUploader } from "@/components/shared/multi-image-uploader";

/**
 * Multi-photo input for admin forms: uploads through /api/upload (admin kind)
 * and manages an ordered list of URLs with per-photo remove.
 *
 * Delegates to MultiImageUploader so the admin gets the same multi-select,
 * drag & drop, concurrent upload and progress behaviour as the public form.
 * Props are unchanged.
 */
export function AdminPhotoList({
  value,
  onChange,
  onUploadingChange,
  max = 10
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Lets the parent disable its submit button while an upload is in flight. */
  onUploadingChange?: (uploading: boolean) => void;
  max?: number;
}) {
  return (
    <MultiImageUploader
      value={value}
      onChange={onChange}
      kind="admin"
      max={max}
      variant="compact"
      onUploadingChange={onUploadingChange}
      labels={{
        add: "Upload photos",
        empty: "No photos yet",
        remove: "Remove photo",
        maxReached: `Max ${max} photos`,
        dropHint: "or drop files here",
        alt: "Photo"
      }}
    />
  );
}
