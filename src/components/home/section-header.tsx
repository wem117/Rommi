import type { ReactNode } from "react";

/**
 * Badge + heading + supporting line, shared by the homepage bands.
 *
 * Moved out of home-client.tsx unchanged so the FAQ can use the same header
 * rather than restating its markup. Rendering is identical for every existing
 * caller.
 */
export function SectionHeader({
  badge,
  title,
  description,
  centered = false,
  light = false,
  titleId
}: {
  badge?: string;
  title: ReactNode;
  description?: string;
  centered?: boolean;
  light?: boolean;
  /** Set when the surrounding section is labelled by this heading. */
  titleId?: string;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      {badge ? (
        <span
          className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
            light ? "bg-white/10 text-white/80" : "bg-accent/10 text-accent"
          }`}
        >
          {badge}
        </span>
      ) : null}
      <h2
        id={titleId}
        className={`mt-3 text-2xl font-bold sm:mt-4 sm:text-4xl ${light ? "text-white" : "text-foreground"}`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-2 max-w-2xl text-sm leading-6 sm:mt-3 sm:leading-7 sm:text-base ${centered ? "mx-auto" : ""} ${
            light ? "text-white/75" : "text-foreground/60"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
