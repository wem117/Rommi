"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";

import { useLocale } from "@/context/locale-context";

export function ListingGallery({ photos, title }: { photos: string[]; title: string }) {
  const { t } = useLocale();

  if (!photos.length) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-gradient-to-br from-surface-muted to-card shadow-soft sm:h-64">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ImageOff className="h-5 w-5 text-primary/60" />
        </span>
        <p className="text-sm font-medium text-foreground/50">{t("shared.noPhotosAdded")}</p>
      </div>
    );
  }

  const [cover, ...rest] = photos;

  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-background shadow-soft">
        <Image src={cover} alt={title} fill priority className="object-cover" sizes="(min-width: 768px) 60vw, 100vw" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rest.slice(0, 4).map((photo, index) => (
          <div key={photo} className="relative min-h-32 overflow-hidden rounded-2xl bg-background shadow-soft">
            <Image src={photo} alt={`${title} ${index + 2}`} fill className="object-cover" sizes="25vw" />
          </div>
        ))}
      </div>
    </div>
  );
}
