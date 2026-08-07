"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The shell both search pages sit in: /rooms and /roommates.
 *
 * They drifted into two designs of the same screen. Not subtly — different page
 * backgrounds (`#faf6ef` vs `#fbf8f3`), different container widths (`max-w-6xl`
 * vs `max-w-[1180px]`), different header rhythm, different corner radii, and
 * about thirty raw hex colours between them while the listing card beside them
 * used design tokens throughout.
 *
 * The raw hex is the part that was not merely cosmetic. Tailwind's `darkMode:
 * ["class"]` swaps CSS VARIABLES; a literal `#faf6ef` cannot respond to it. So
 * every hardcoded colour on these pages was a patch of permanently-light UI, and
 * no amount of theming would have moved it.
 *
 * Everything here is token-based (`bg-background`, `border-border`, `bg-card`,
 * `text-foreground`) so both pages theme together and stay identical by
 * construction rather than by two people remembering to.
 */
export function SearchPageShell({
  title,
  description,
  action,
  filters,
  meta,
  children
}: {
  title: string;
  description: string;
  /** Optional primary call to action in the header (e.g. "List a room"). */
  action?: { href: string; label: string };
  /** The filter controls — each page supplies its own, in the same frame. */
  filters: ReactNode;
  /** Result count, view toggle, anything that sits under the filters. */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[70vh] bg-background">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60 sm:mt-3 sm:text-base sm:leading-7">
                {description}
              </p>
            </div>

            {action ? (
              <Link
                href={action.href}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:self-auto sm:px-6 sm:py-3"
              >
                {action.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="mt-5 sm:mt-8">{filters}</div>

          {meta ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-4">{meta}</div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 lg:px-8">{children}</section>
    </main>
  );
}

/**
 * A labelled filter control.
 *
 * Both pages needed this and only one had it, so the roommates page grew its own
 * local `Field`. Shared so the label rhythm cannot drift again.
 */
export function FilterField({
  label,
  htmlFor,
  className = "",
  children
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">{label}</span>
      {children}
    </label>
  );
}

/**
 * The panel filters sit in, matched to the listing filter bar.
 */
export function FilterPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface-muted/40 p-3 sm:p-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Empty / error / loading states, in one shape for both pages.
 *
 * The two had visibly different cards for the same situation — different radius,
 * padding and heading size — which is the kind of difference a user reads as
 * "these are two different products".
 */
export function SearchStateCard({
  title,
  children,
  action
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft sm:p-10">
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      {children ? <div className="mt-3 text-sm text-foreground/60">{children}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Loading placeholders sized to the cards they stand in for. */
export function SearchSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-[340px] animate-pulse rounded-2xl border border-border bg-card shadow-soft sm:h-[400px]"
        />
      ))}
    </div>
  );
}
