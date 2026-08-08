"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

import { useLocale } from "@/context/locale-context";
import type { Testimonial } from "@/lib/data/testimonials";
import { buildRows, MIN_FOR_MARQUEE } from "@/lib/utils/testimonial-rows";

/**
 * Two rows of testimonials flowing in opposite directions, forever.
 *
 * This replaces an arrow-and-dots carousel that showed one testimonial at a
 * time. A carousel asks the visitor to operate it, which almost nobody does, so
 * the social proof past slide one was never seen. A continuous stream shows a
 * dozen at a glance and reads as volume — the point of a testimonial wall is
 * "many people use this", and that is a quantity you have to *see*.
 *
 * HOW THE LOOP IS SEAMLESS
 * The track renders the list twice and is `width: max-content`. The CSS
 * animation translates it exactly -50%, which is precisely the width of one
 * copy — so the moment the animation restarts, copy 2 is sitting exactly where
 * copy 1 was, pixel for pixel. There is no jump to hide because no discontinuity
 * exists. This is why the duplication is structural rather than decorative, and
 * why the translate cannot be a px value.
 *
 * WHY NOT JAVASCRIPT
 * No rAF loop, no scroll listener, no state. The whole animation is one CSS
 * keyframe on a composited layer, so it runs off the main thread, never
 * re-renders React, and does not compete with hydration on a page that is
 * already loading listings and universities.
 */

/** Duration scales with card count so the stream moves at one constant speed. */
const SECONDS_PER_CARD = 7;

function Stars({ rating }: { rating: number }) {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${clamped} / 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={
            index < clamped
              ? "h-3.5 w-3.5 fill-highlight text-highlight"
              : "h-3.5 w-3.5 text-foreground/20"
          }
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure
      className="mr-4 flex w-[17rem] shrink-0 flex-col rounded-card border border-border/80 bg-card p-5 shadow-elev-2 sm:mr-5 sm:w-[21rem] sm:p-6"
    >
      <Stars rating={testimonial.rating} />

      {/* line-clamp keeps every card the same height without fixing one, so a
          long quote cannot make its row taller than the one beside it. */}
      <blockquote className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-foreground/80">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-4 flex items-center gap-3 border-t border-border/70 pt-4">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          {testimonial.image ? (
            <Image src={testimonial.image} alt="" fill className="object-cover" sizes="36px" />
          ) : (
            <span className="grid h-full place-items-center text-xs font-bold text-primary">
              {testimonial.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{testimonial.name}</div>
          {/* Structured university + city, falling back to the legacy free-text
              `role` for rows written before those columns existed. Joined here
              rather than stored pre-joined so the separator stays a design
              decision instead of something an admin has to type correctly. */}
          {(() => {
            const meta = [testimonial.university, testimonial.city].filter(Boolean).join(" · ") || testimonial.role;
            return meta ? <div className="truncate text-xs text-foreground/55">{meta}</div> : null;
          })()}
        </div>
      </figcaption>
    </figure>
  );
}

function FlowRow({
  items,
  direction,
  durationSeconds
}: {
  items: Testimonial[];
  direction: "left" | "right";
  durationSeconds: number;
}) {
  return (
    <div className="roomi-flow-mask overflow-hidden">
      <div
        className="roomi-flow-track"
        data-direction={direction}
        style={{ ["--flow-duration" as string]: `${durationSeconds}s` }}
      >
        {/* The real set — the one screen readers read.
            The key is the DATABASE id plus its slot: the id alone is not unique
            once `repeatToFill` has repeated the sequence to fill the row, and
            duplicate keys make React reuse the wrong card when the list changes.
            The id stays the stable part, so a reorder still moves a card rather
            than remounting the row. */}
        {items.map((testimonial, slot) => (
          <TestimonialCard key={`${testimonial.id}-${slot}`} testimonial={testimonial} />
        ))}

        {/*
          The loop copy. `aria-hidden` and `inert`-by-omission: it exists only so
          the translate has somewhere to go, and announcing every testimonial
          twice would be a bug, not a feature. Nothing inside is focusable, so it
          cannot be reached by keyboard either.
        */}
        <div className="roomi-flow-duplicate flex" aria-hidden="true">
          {items.map((testimonial, slot) => (
            <TestimonialCard key={`dup-${testimonial.id}-${slot}`} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsFlow({ testimonials }: { testimonials: Testimonial[] }) {
  const { t } = useLocale();

  const { topRow, bottomRow, duration } = useMemo(() => {
    // Split into two rows once there is enough material for them to differ.
    // Below four, both rows carry the whole set: two rows of one card each
    // would be mostly empty track, and a half-empty marquee looks broken in a
    // way that showing the same person twice does not.
    const { top: topFilled, bottom: bottomFilled } = buildRows(testimonials);
    return {
      topRow: topFilled,
      bottomRow: bottomFilled,
      // Scales with the FILLED length, not the raw record count: the track got
      // longer when it was repeated, and a fixed duration would make a row of
      // twelve cards fly past at twice the speed of a row of six.
      duration: Math.max(28, topFilled.length * SECONDS_PER_CARD)
    };
  }, [testimonials]);

  if (testimonials.length === 0) return null;

  return (
    <section
      key="testimonials"
      className="overflow-hidden bg-surface-muted/40 py-12 sm:py-20"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          id="testimonials-heading"
          className="font-heading text-display-sm text-foreground sm:text-display-md"
        >
          {t("home.testimonialFlowTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-foreground/60 sm:text-base sm:leading-7">
          {t("home.testimonialFlowSubtitle")}
        </p>
      </div>

      {testimonials.length < MIN_FOR_MARQUEE ? (
        /* One or two real testimonials: show them once, centred and still.
           See MIN_FOR_MARQUEE — a loop this short is a wall of the same face. */
        <div className="mx-auto mt-8 flex max-w-6xl flex-wrap justify-center gap-4 px-4 sm:mt-12 sm:gap-5 sm:px-6 lg:px-8">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      ) : (
        /* Full-bleed: the rows must extend past the container so cards enter and
           leave the viewport rather than stopping at a margin. The section clips
           overflow, so this can never produce horizontal page scroll. */
        <div className="mt-8 space-y-4 sm:mt-12 sm:space-y-5">
          <FlowRow items={topRow} direction="left" durationSeconds={duration} />
          <FlowRow items={bottomRow} direction="right" durationSeconds={duration + 6} />
        </div>
      )}
    </section>
  );
}
