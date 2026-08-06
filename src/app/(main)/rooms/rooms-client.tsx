"use client";

import { ArrowRight, List, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ListingFiltersBar } from "@/components/listings/listing-filters";
import { ListingGrid } from "@/components/listings/listing-grid";
import { Pagination } from "@/components/listings/pagination";
import { LazyMap, type MapMarker } from "@/components/map/lazy-map";
import { useLocale } from "@/context/locale-context";
import { useDebounce } from "@/hooks/use-debounce";
import { buildListingQueryString, type ListingPage, type ListingQueryFilters } from "@/lib/data/listing-query";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Browse UI.
 *
 * The server owns the data: this component renders the page it was handed and
 * navigates to a new URL whenever the filters or the page change. It holds no
 * copy of the listings and never fetches them.
 *
 * That is a deliberate reversal of the previous design, where the list lived in
 * client state and grew by appending. Three bugs came from that one decision —
 * a counter that could only report what had been loaded, a page number that
 * existed nowhere but memory, and a server render that had to guess which
 * filters the client would end up applying. With the URL as the single source
 * of truth all three stop being possible: refresh, back/forward, a shared link
 * and a crawler all resolve to exactly the same page.
 */
export default function RoomsClient({
  initial,
  filters: serverFilters
}: {
  initial: ListingPage;
  filters: ListingQueryFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const [view, setView] = useState<"list" | "map">("list");

  // Local echo of the server's filters so typing feels instant. The URL remains
  // authoritative: it is rewritten from this state, and re-syncs from the server
  // props whenever a navigation lands.
  const [filters, setFilters] = useState<ListingQueryFilters>(serverFilters);

  // Search is debounced so a navigation isn't fired per keystroke; everything
  // else (selects, sliders) applies as soon as it changes.
  const debouncedSearch = useDebounce(filters.search ?? "", 350);
  const pendingFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  // Both sides are compared as their canonical query strings, which normalises
  // away empty values and key order, so this is an equality test on the FILTERS
  // and nothing else.
  const pendingQuery = buildListingQueryString(pendingFilters, 1);
  const serverQuery = buildListingQueryString(serverFilters, 1);

  // Re-seed local state whenever a navigation lands on different filters (back
  // button, a shared link, a filter reset).
  useEffect(() => {
    setFilters(serverFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQuery]);

  /**
   * Pushes a filter change into the URL, resetting to page 1 — staying on page
   * 7 of a result set that just shrank to two pages would show an empty grid.
   *
   * Deliberately keyed on the FILTERS only. Keying it on the full URL (filters
   * + page) meant that landing on /rooms?page=2 saw a mismatch against the
   * page-1 URL this effect wants to build, and immediately navigated back to
   * page 1 — the page number was unreachable except by winning a race.
   */
  useEffect(() => {
    if (pendingQuery === serverQuery) return;
    // `replace` so filter tweaks don't fill the back stack with near-identical
    // entries; the page links below are real navigations and use push.
    router.replace(`${pathname}${pendingQuery}`, { scroll: false });
  }, [pendingQuery, serverQuery, pathname, router]);

  const hrefFor = (page: number) => `${pathname}${buildListingQueryString(pendingFilters, page)}`;

  const { listings, total, page, pageSize, totalPages } = initial;

  const mapMarkers = useMemo<MapMarker[]>(
    () =>
      listings
        .filter((listing) => listing.lat != null && listing.lng != null)
        .map((listing) => ({
          id: listing.id,
          lat: listing.lat as number,
          lng: listing.lng as number,
          title: listing.title,
          price:
            listing.monthlyRent == null
              ? t("listingDetail.priceNotSpecified")
              : formatCurrency(listing.monthlyRent),
          district: listing.district,
          university: listing.university,
          photo: listing.photoUrls[0],
          href: `/rooms/${listing.id}`
        })),
    // `t` belongs here now that a marker can carry a translated
    // "Price not specified": without it, switching language left the old
    // label on every pin until the listings themselves changed.
    [listings, t]
  );

  const firstOnPage = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastOnPage = Math.min(page * pageSize, total);

  return (
    <main className="min-h-[70vh] bg-[#faf6ef]">
      <section className="border-b border-[#ece1d3] bg-[#fffdf9]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-5xl">{t("rooms.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60 sm:mt-3 sm:leading-7 sm:text-base">
                {t("rooms.description")}
              </p>
            </div>

            <Link
              href="/list-a-room/step-1"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:px-6 sm:py-3"
            >
              {t("rooms.listRoom")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 sm:mt-8">
            {/* `total`, never `listings.length` — the whole point of the fix. */}
            <ListingFiltersBar filters={filters} onChange={setFilters} count={total} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-4">
            {totalPages > 1 ? (
              <p className="text-xs text-foreground/55 sm:text-sm">
                {t("rooms.showingRange")
                  .replace("{from}", String(firstOnPage))
                  .replace("{to}", String(lastOnPage))
                  .replace("{total}", String(total))}
              </p>
            ) : (
              <span />
            )}

            <div className="inline-flex rounded-full border border-[#e6daca] bg-white p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                  view === "list" ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
                }`}
                aria-pressed={view === "list"}
              >
                <List className="h-4 w-4" />
                {t("rooms.listView")}
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                  view === "map" ? "bg-primary text-white" : "text-foreground/60 hover:text-foreground"
                }`}
                aria-pressed={view === "map"}
              >
                <MapIcon className="h-4 w-4" />
                {t("rooms.mapView")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
        {view === "map" ? (
          mapMarkers.length > 0 ? (
            <div className="h-[70vh] overflow-hidden rounded-[1.75rem] border border-[#ece1d3] shadow-soft">
              <LazyMap markers={mapMarkers} openLabel={t("rooms.openListing")} />
            </div>
          ) : (
            <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-soft">
              <p className="text-sm text-foreground/60">{t("rooms.mapEmpty")}</p>
            </div>
          )
        ) : null}

        {view === "list" && listings.length === 0 ? (
          <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-soft">
            {/* An out-of-range page is a different situation from "nothing
                matches", and telling a visitor their filters found nothing when
                the filters found plenty would send them off to change them. */}
            {total > 0 ? (
              <>
                <h2 className="font-heading text-2xl font-bold">{t("rooms.pageEmptyTitle")}</h2>
                <Link
                  href={hrefFor(1)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {t("rooms.backToFirstPage")}
                </Link>
              </>
            ) : (
              <>
                <h2 className="font-heading text-2xl font-bold">{t("rooms.emptyTitle")}</h2>
                <p className="mt-2 text-sm text-foreground/60">{t("rooms.emptyText")}</p>
              </>
            )}
          </div>
        ) : null}

        {view === "list" && listings.length > 0 ? (
          <>
            <ListingGrid listings={listings} />
            <Pagination page={page} totalPages={totalPages} buildHref={hrefFor} />
          </>
        ) : null}
      </section>
    </main>
  );
}
