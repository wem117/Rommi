"use client";

import { useLocale } from "@/context/locale-context";
import { MultiImageUploader } from "@/components/shared/multi-image-uploader";

const MAX_LISTING_IMAGES = 10;

/**
 * Listing photos for the public "list a room" form.
 *
 * Delegates to MultiImageUploader: several files at once, drag & drop,
 * concurrent uploads with per-file progress, local previews before the upload
 * completes, and per-photo removal. Props are unchanged, so every call site
 * keeps working.
 */
export function PhotoUploader({
  value,
  onChange
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const { t } = useLocale();

  return (
    <div>
      <div>
        <label>{t("listingForm.photos")}</label>
        <p className="mt-1 text-xs text-foreground/55">{t("listingForm.photosHelp")}</p>
      </div>

      <div className="mt-4">
        <MultiImageUploader
          value={value}
          onChange={onChange}
          kind="listings"
          max={MAX_LISTING_IMAGES}
          labels={{
            add: t("listingForm.addPhotos"),
            empty: t("listingForm.photoEmpty"),
            remove: t("listingForm.removePhoto"),
            maxReached: t("listingForm.maxImages"),
            dropHint: t("listingForm.dropHint"),
            alt: t("shared.listingPhotoAlt")
          }}
        />
      </div>
    </div>
  );
}
