"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Accessible, dependency-free carousel built on native CSS scroll-snap.
 *
 * - Touch swipe works natively via `overflow-x-auto`.
 * - Mouse drag-to-scroll is added via pointer events.
 * - Keyboard: ArrowLeft/ArrowRight move one slide when the track is focused.
 * - Prev/Next buttons and dot indicators reflect and control scroll position.
 *
 * Each child becomes a snap slide; `itemClassName` controls slide width
 * (e.g. responsive `basis`) so the same component works for 1-up testimonials
 * or 3-up listing cards.
 */
export function Carousel({
  children,
  ariaLabel,
  itemClassName = "basis-full",
  className = ""
}: {
  children: ReactNode[];
  ariaLabel?: string;
  itemClassName?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const slideCount = children.length;

  const updateState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const { scrollLeft, scrollWidth, clientWidth } = track;
    setAtStart(scrollLeft <= 2);
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2);

    const slide = track.children[0] as HTMLElement | undefined;
    const slideWidth = slide ? slide.getBoundingClientRect().width : clientWidth;
    setActiveIndex(Math.round(scrollLeft / (slideWidth || 1)));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateState();
    track.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    return () => {
      track.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [updateState]);

  const scrollByDir = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[0] as HTMLElement | undefined;
    const amount = slide ? slide.getBoundingClientRect().width + 16 : track.clientWidth;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByDir(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByDir(-1);
    }
  }

  // Pointer drag-to-scroll (desktop mouse).
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { active: true, startX: event.clientX, startScroll: track.scrollLeft, moved: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    const delta = event.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    track.scrollLeft = drag.current.startScroll - delta;
  }

  function endDrag() {
    drag.current.active = false;
  }

  return (
    // min-w-0/max-w-full: a grid/flex parent must always be able to shrink the
    // carousel to the available width — without this, `min-width: auto` sizes
    // the column to the track's min-content width and the page overflows on
    // mobile (the slides are shrink-0, so their content drives min-content).
    <div className={`relative min-w-0 max-w-full ${className}`}>
      {/* A focusable carousel region with arrow-key handling is exactly the
          pattern the WAI-ARIA Authoring Practices prescribe: role="region",
          aria-roledescription, tabIndex so keyboard users can reach the track,
          and a keydown handler for navigation. The rule has no way to express
          "this region IS the widget", so it is disabled here specifically
          rather than project-wide. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(event) => {
          // Swallow the click that ends a drag so cards aren't accidentally opened.
          if (drag.current.moved) {
            event.preventDefault();
            event.stopPropagation();
            drag.current.moved = false;
          }
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] focus:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${slideCount}`}
            className={`shrink-0 snap-start ${itemClassName}`}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Prev/Next — pointer devices only */}
      <button
        type="button"
        aria-label="Previous"
        onClick={() => scrollByDir(-1)}
        disabled={atStart}
        className="absolute -left-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full border border-border bg-card p-2 shadow-soft transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-0 sm:grid"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => scrollByDir(1)}
        disabled={atEnd}
        className="absolute -right-3 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full border border-border bg-card p-2 shadow-soft transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-0 sm:grid"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      {slideCount > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {children.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => scrollToIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? "w-6 bg-primary" : "w-2 bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
