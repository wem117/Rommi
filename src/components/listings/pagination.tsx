"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { useLocale } from "@/context/locale-context";
import { pageNumbers } from "@/lib/data/listing-query";

/**
 * Numbered pagination.
 *
 * Every control is a real `<a href>` built by `buildHref`, not a click handler.
 * That is what makes the requirement "must work with SSR and SEO" true rather
 * than merely claimed: a crawler can follow page 2, the browser's back button
 * works, and a page can be opened in a new tab or shared. Next.js still handles
 * the click as a client-side navigation, so it stays fast.
 */
export function Pagination({
  page,
  totalPages,
  buildHref
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  const { t } = useLocale();

  // One page of results needs no controls at all — 14 listings is page 1 only.
  if (totalPages <= 1) return null;

  const pages = pageNumbers(page, totalPages);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border px-3 text-sm font-semibold transition";
  const idle = "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary";
  const disabled = "border-border/60 bg-card/60 text-foreground/35 pointer-events-none";

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label={t("rooms.pageLabel")}>
      {hasPrevious ? (
        <Link href={buildHref(page - 1)} rel="prev" className={`${base} ${idle}`} aria-label={t("rooms.previousPage")}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("rooms.previousPage")}</span>
        </Link>
      ) : (
        <span className={`${base} ${disabled}`} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("rooms.previousPage")}</span>
        </span>
      )}

      {pages.map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-foreground/40" aria-hidden="true">
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className={`${base} border-primary bg-primary text-white`}
          >
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            className={`${base} ${idle}`}
            aria-label={t("rooms.goToPage").replace("{page}", String(entry))}
          >
            {entry}
          </Link>
        )
      )}

      {hasNext ? (
        <Link href={buildHref(page + 1)} rel="next" className={`${base} ${idle}`} aria-label={t("rooms.nextPage")}>
          <span className="hidden sm:inline">{t("rooms.nextPage")}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${base} ${disabled}`} aria-disabled="true">
          <span className="hidden sm:inline">{t("rooms.nextPage")}</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
