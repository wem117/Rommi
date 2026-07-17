"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "@/context/locale-context";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SWIPE_THRESHOLD = 60;
const WHEEL_COOLDOWN_MS = 350;

/**
 * Fullscreen photo lightbox (original Roomi implementation, Airbnb/Krisha-level
 * usability): keyboard (←/→/Esc) + focus trap, wheel navigation, zoom via
 * buttons / double-click / pinch, pan while zoomed, touch swipe, adjacent-image
 * preloading, counter, and a thumbnail strip. Dependency-free — gestures are
 * unified through Pointer Events with `touch-action: none`.
 */
export function GalleryLightbox({
  photos,
  title,
  initialIndex,
  onClose
}: {
  photos: string[];
  title: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastWheelAt = useRef(0);
  // Active pointers for unified mouse/touch gestures (pan, swipe, pinch).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, startOffset: { x: 0, y: 0 }, pinchStartDist: 0, pinchStartScale: 1 });

  const count = photos.length;

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      setIndex((current) => (current + direction + count) % count);
      resetView();
    },
    [count, resetView]
  );

  const clampOffset = useCallback((next: { x: number; y: number }, nextScale: number) => {
    const stage = stageRef.current;
    if (!stage) return next;
    const maxX = (stage.clientWidth * (nextScale - 1)) / 2;
    const maxY = (stage.clientHeight * (nextScale - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y))
    };
  }, []);

  const applyScale = useCallback(
    (nextScale: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      setScale(clamped);
      setOffset((current) => (clamped === 1 ? { x: 0, y: 0 } : clampOffset(current, clamped)));
    },
    [clampOffset]
  );

  // Keyboard: Esc closes, arrows navigate, Tab is trapped inside the dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(-1);
        return;
      }
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate, onClose]);

  // Lock page scroll while open; move focus into the dialog and restore after.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Preload neighbours so next/previous appear instantly.
  const visibleIndexes = useMemo(() => {
    if (count <= 1) return [index];
    const set = new Set([index, (index + 1) % count, (index - 1 + count) % count]);
    return [...set];
  }, [count, index]);

  function onWheel(event: React.WheelEvent) {
    // Trackpad pinch arrives as ctrl+wheel — use it for zoom.
    if (event.ctrlKey || event.metaKey) {
      applyScale(scale - event.deltaY * 0.01);
      return;
    }
    if (scale > 1) return;
    const now = Date.now();
    if (now - lastWheelAt.current < WHEEL_COOLDOWN_MS) return;
    if (Math.abs(event.deltaY) < 12 && Math.abs(event.deltaX) < 12) return;
    lastWheelAt.current = now;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    navigate(delta > 0 ? 1 : -1);
  }

  function onPointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      gesture.current.startX = event.clientX;
      gesture.current.startY = event.clientY;
      gesture.current.startOffset = { ...offset };
      if (scale > 1) setDragging(true);
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.pinchStartScale = scale;
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinchStartDist > 0) {
        applyScale(gesture.current.pinchStartScale * (dist / gesture.current.pinchStartDist));
      }
      return;
    }

    if (scale > 1 && pointers.current.size === 1) {
      const next = {
        x: gesture.current.startOffset.x + (event.clientX - gesture.current.startX),
        y: gesture.current.startOffset.y + (event.clientY - gesture.current.startY)
      };
      setOffset(clampOffset(next, scale));
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    setDragging(false);
    if (wasSingle && scale === 1) {
      const dx = event.clientX - gesture.current.startX;
      const dy = event.clientY - gesture.current.startY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        navigate(dx < 0 ? 1 : -1);
      }
    }
  }

  function onDoubleClick() {
    applyScale(scale > 1 ? 1 : 2);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — ${t("gallery.photosLabel")}`}
      className="roomi-lightbox-in fixed inset-0 z-[100] flex flex-col bg-black"
    >
      {/* Top bar: counter + close */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6">
        <span aria-live="polite" className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyScale(scale + 0.5)}
            disabled={scale >= MAX_SCALE}
            aria-label={t("gallery.zoomIn")}
            className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40 sm:flex"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => applyScale(scale - 0.5)}
            disabled={scale <= MIN_SCALE}
            aria-label={t("gallery.zoomOut")}
            className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40 sm:flex"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("gallery.close")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 select-none overflow-hidden"
        style={{ touchAction: "none" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {visibleIndexes.map((photoIndex) => {
          const active = photoIndex === index;
          return (
            <div
              key={photos[photoIndex]}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-300 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <div
                className="relative h-full w-full"
                style={
                  active
                    ? {
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        transition: dragging ? "none" : "transform 0.25s ease-out",
                        cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in"
                      }
                    : undefined
                }
              >
                <Image
                  src={photos[photoIndex]}
                  alt={`${title} — ${photoIndex + 1} / ${count}`}
                  fill
                  quality={90}
                  sizes="100vw"
                  priority={active}
                  draggable={false}
                  className="object-contain"
                />
              </div>
            </div>
          );
        })}

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={t("gallery.prevPhoto")}
              className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 sm:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label={t("gallery.nextPhoto")}
              className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 sm:flex"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>

      {/* Thumbnail strip */}
      {count > 1 ? (
        <div className="relative z-10 hidden justify-center px-4 py-3 sm:flex">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((photo, photoIndex) => (
              <button
                key={photo}
                type="button"
                onClick={() => {
                  setIndex(photoIndex);
                  resetView();
                }}
                aria-label={`${t("gallery.goToPhoto")} ${photoIndex + 1}`}
                aria-current={photoIndex === index}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition ${
                  photoIndex === index
                    ? "ring-2 ring-white"
                    : "opacity-50 hover:opacity-90 focus-visible:opacity-90"
                }`}
              >
                <Image src={photo} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
