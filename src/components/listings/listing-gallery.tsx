"use client";

import { ChevronLeft, ChevronRight, ImageOff, LayoutGrid } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { GalleryLightbox } from "@/components/listings/gallery-lightbox";
import { useLocale } from "@/context/locale-context";

/**
 * Listing photo gallery (original Roomi take on the Airbnb/Krisha pattern):
 * - Desktop (lg+): hero image + grid with a "Show all photos" button.
 * - Mobile/tablet: inline scroll-snap swipe carousel with arrows, counter,
 *   and dots — browsable without leaving the page.
 * - Any photo opens the fullscreen GalleryLightbox at that index.
 * Fixed aspect-ratio containers prevent layout shift while images load.
 */
export function ListingGallery({ photos, title }: { photos: string[]; title: string }) {
  const { t } = useLocale();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  return (
    <>
      <div className="lg:hidden">
        <InlineCarousel photos={photos} title={title} onOpen={setLightboxIndex} />
      </div>
      <div className="hidden lg:block">
        <DesktopGrid photos={photos} title={title} onOpen={setLightboxIndex} />
      </div>

      {lightboxIndex !== null ? (
        <GalleryLightbox
          photos={photos}
          title={title}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}

/** Airbnb-style hero + grid. Every tile opens the lightbox at its index. */
function DesktopGrid({
  photos,
  title,
  onOpen
}: {
  photos: string[];
  title: string;
  onOpen: (index: number) => void;
}) {
  const { t } = useLocale();
  const count = photos.length;
  const sideCount = count >= 5 ? 4 : Math.min(2, count - 1);
  const sidePhotos = photos.slice(1, 1 + sideCount);

  const tile = (photoIndex: number, sizes: string, priority = false) => (
    <button
      key={photos[photoIndex]}
      type="button"
      onClick={() => onOpen(photoIndex)}
      aria-label={`${t("gallery.openPhoto")} ${photoIndex + 1} / ${count}`}
      className="group/tile relative h-full w-full overflow-hidden focus-visible:z-10"
    >
      <Image
        src={photos[photoIndex]}
        alt={`${title} — ${photoIndex + 1}`}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition duration-500 group-hover/tile:scale-105 group-hover/tile:brightness-95"
      />
    </button>
  );

  return (
    <div className="relative">
      <div
        className={`grid h-[440px] gap-2 overflow-hidden rounded-[2rem] shadow-soft ${
          sideCount === 0
            ? "grid-cols-1"
            : sideCount === 4
              ? "grid-cols-4 grid-rows-2"
              : "grid-cols-3 grid-rows-2"
        }`}
      >
        <div className={sideCount === 0 ? "relative" : "relative col-span-2 row-span-2"}>
          {tile(0, sideCount === 0 ? "100vw" : "60vw", true)}
        </div>
        {sidePhotos.map((photo, i) => (
          <div key={photo} className="relative">
            {tile(i + 1, "25vw")}
          </div>
        ))}
      </div>

      {count > 1 ? (
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95"
        >
          <LayoutGrid className="h-4 w-4" />
          {t("gallery.showAllPhotos")} ({count})
        </button>
      ) : null}
    </div>
  );
}

/**
 * Inline scroll-snap carousel: native touch swipe, mouse drag, arrows,
 * counter chip, and dots. A tap (not a drag) opens the lightbox.
 */
function InlineCarousel({
  photos,
  title,
  onOpen
}: {
  photos: string[];
  title: string;
  onOpen: (index: number) => void;
}) {
  const { t } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const count = photos.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setActive(Math.round(track.scrollLeft / (track.clientWidth || 1)));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.min(count - 1, Math.max(0, index));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-soft">
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} — ${t("gallery.photosLabel")}`}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:aspect-[16/9] [&::-webkit-scrollbar]:hidden"
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") return;
          const track = trackRef.current;
          if (!track) return;
          drag.current = { active: true, startX: event.clientX, startScroll: track.scrollLeft, moved: false };
        }}
        onPointerMove={(event) => {
          if (!drag.current.active) return;
          const track = trackRef.current;
          if (!track) return;
          const delta = event.clientX - drag.current.startX;
          if (Math.abs(delta) > 4) drag.current.moved = true;
          track.scrollLeft = drag.current.startScroll - delta;
        }}
        onPointerUp={() => {
          drag.current.active = false;
        }}
        onPointerLeave={() => {
          drag.current.active = false;
        }}
        onClickCapture={(event) => {
          if (drag.current.moved) {
            event.preventDefault();
            event.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {photos.map((photo, index) => (
          <button
            key={photo}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`${t("gallery.openPhoto")} ${index + 1} / ${count}`}
            className="relative h-full w-full shrink-0 snap-center"
          >
            {/* Eager (not priority) on the first slide: it's the mobile LCP, but
                this variant is display-hidden on desktop where the grid hero
                already preloads — a preload link here would double-fetch. */}
            <Image
              src={photo}
              alt={`${title} — ${index + 1}`}
              fill
              loading={index === 0 ? "eager" : "lazy"}
              sizes="100vw"
              className="object-cover"
              draggable={false}
            />
          </button>
        ))}
      </div>

      {count > 1 ? (
        <>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {active + 1} / {count}
          </span>

          {count <= 8 ? (
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${
                    index === active ? "w-4 opacity-100" : "w-1.5 opacity-60"
                  }`}
                />
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => scrollToIndex(active - 1)}
            disabled={active === 0}
            aria-label={t("gallery.prevPhoto")}
            className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md backdrop-blur transition hover:scale-105 disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(active + 1)}
            disabled={active === count - 1}
            aria-label={t("gallery.nextPhoto")}
            className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md backdrop-blur transition hover:scale-105 disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
    </div>
  );
}
