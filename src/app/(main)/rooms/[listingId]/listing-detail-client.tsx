"use client";

import {
  BedDouble,
  CalendarDays,
  ExternalLink,
  Home,
  MapPin,
  ShowerHead,
  Users
} from "lucide-react";
import { useMemo } from "react";

import { ListingDescription } from "@/components/listings/listing-description";
import { ListingGallery } from "@/components/listings/listing-gallery";
import { ListingGrid } from "@/components/listings/listing-grid";
import { ListingOwnerCard } from "@/components/listings/listing-owner-card";
import { LazyMap } from "@/components/map/lazy-map";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useListing } from "@/hooks/use-listing";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AMENITY_GROUPS, amenityIcon, isKnownAmenity } from "@/lib/utils/amenities";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";
import { useEffect } from "react";
import { recordViewedListing } from "@/lib/data/profiles";

/**
 * Listing detail page.
 *
 * READING ORDER (identical on mobile and desktop, which is the point):
 *   gallery -> title -> address -> price -> key facts -> amenities ->
 *   description -> contact -> location -> similar
 *
 * The description used to sit BELOW the map, so the one block explaining what
 * the place actually is came after a 360px map the reader had to scroll past.
 * A renter decides from the description; the map only answers "where", which is
 * a later question. It now sits directly under the amenities, above both the
 * host card and the map.
 *
 * On desktop the contact card is pulled into a sticky right column, so the
 * content column keeps that same order while the primary action stays in view.
 * On mobile there is no second column, so the card appears inline after the
 * description — exactly where a reader who has just finished reading is ready
 * to act.
 *
 * This is still a client component because the locale lives in React state
 * (locale-context.tsx hydrates it from localStorage), so every translated
 * string has to render on the client. Moving the static half to server
 * components would require a cookie-driven i18n rewrite, which is a much larger
 * change than this redesign. What HAS moved to the server is the data: the
 * owner profile and the similar-listings pool now arrive as props instead of
 * being fetched from effects after hydration.
 */
export default function ListingDetailClient({
  listingId,
  initialListing,
  owner,
  ownerContacts,
  similarListings
}: {
  listingId: string;
  initialListing: Listing | null;
  /** Resolved server-side — no post-hydration fetch, no layout shift. */
  owner: UserProfile | null;
  /** WhatsApp/Instagram, resolved server-side (see lib/data/public-contacts). */
  ownerContacts?: { whatsapp: string; instagram: string };
  /** Ranked server-side from the newest listings. */
  similarListings: Listing[];
}) {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { listing, loading, error } = useListing(listingId, initialListing);

  const listingTypeLabels = {
    private_room: t("listingDetail.privateRoom"),
    shared_room: t("listingDetail.sharedRoom"),
    entire_place: t("listingDetail.entirePlace")
  } as const;

  useEffect(() => {
    if (!user?.uid || !listing?.id) return;
    void recordViewedListing(user.uid, listing.id);
  }, [listing?.id, user?.uid]);

  const mapQuery = useMemo(() => {
    if (!listing) return "";
    // Plenty of listings carry no street address — the source post never had
    // one. Empty parts are dropped so the query stays a clean "district, city"
    // instead of starting with a comma, which Maps resolves badly.
    return [listing.address, listing.district, listing.city]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ");
  }, [listing]);

  const groupedAmenities = useMemo(
    () => (listing ? groupAmenities(listing.amenities) : []),
    [listing]
  );

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10">{t("listingDetail.loadingListing")}</main>;
  }

  if (error || !listing) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-card p-8 shadow-soft">{t("listingDetail.listingNotFound")}</div>
      </main>
    );
  }

  const location = [listing.city, listing.district].filter(Boolean).join(", ");

  const ownerCard = (
    <ListingOwnerCard listing={listing} owner={owner} ownerContacts={ownerContacts} />
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <ListingGallery photos={listing.photoUrls} title={listing.title} />

      {/*
        One content column plus a sticky sidebar on lg+. Below lg the sidebar
        collapses into the flow, and `order` places the contact card after the
        description — the mobile hierarchy — without duplicating any markup.
      */}
      <div className="mt-5 flex flex-col gap-8 sm:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-7 lg:contents">
          {/* --- 2/3/4/5: title, address, price, key facts ------------------ */}
          <header className="lg:col-start-1 lg:row-start-1">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {listingTypeLabels[listing.listingType]}
            </span>

            <h1 className="mt-2.5 break-words font-heading text-[1.6rem] font-bold leading-[1.2] tracking-tight text-foreground sm:text-[2.15rem]">
              {listing.title}
            </h1>

            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground/60 sm:text-base">
              <MapPin className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
              <span className="min-w-0 truncate">{location}</span>
            </p>

            {/* Price: the number renters scan for, so it gets its own line and
                the largest type on the page after the title. */}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-y border-border py-3.5">
              <span className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                {formatCurrency(listing.monthlyRent)}
              </span>
              <span className="text-sm font-medium text-foreground/55 sm:text-base">
                {t("listingDetail.perMonth")}
              </span>
              <span className="ml-auto text-xs font-medium text-foreground/55 sm:text-sm">
                {listing.depositRequired
                  ? `${t("listingDetail.depositPrefix")} ${formatCurrency(listing.depositAmount)} ${t("listingDetail.depositSuffix")}`
                  : t("listingDetail.noDeposit")}
              </span>
            </div>

            {/* Key facts. 2 columns on the narrowest phones, 4 from sm up. */}
            <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              <Fact icon={<BedDouble className="h-4 w-4" />} label={t("listingDetail.bedrooms")} value={String(listing.bedrooms)} />
              <Fact icon={<ShowerHead className="h-4 w-4" />} label={t("listingDetail.bathrooms")} value={String(listing.bathrooms)} />
              <Fact icon={<Home className="h-4 w-4" />} label={t("listingDetail.type")} value={listingTypeLabels[listing.listingType]} />
              <Fact
                icon={<CalendarDays className="h-4 w-4" />}
                label={t("listingDetail.available")}
                value={formatDate(listing.availableFrom, locale)}
              />
              {listing.preferences.genderPreference !== "any" ? (
                <Fact
                  icon={<Users className="h-4 w-4" />}
                  label={t("listingDetail.preferredGenderPrefix")}
                  value={t(
                    listing.preferences.genderPreference === "male" ? "listingForm.male" : "listingForm.female"
                  )}
                />
              ) : null}
            </dl>
          </header>

          {/* --- 6: amenities ---------------------------------------------- */}
          {groupedAmenities.length ? (
            <section aria-labelledby="amenities-heading" className="lg:col-start-1 lg:row-start-2">
              <h2 id="amenities-heading" className="font-heading text-lg font-semibold sm:text-xl">
                {t("listingDetail.amenitiesTitle")}
              </h2>
              <div className="mt-3 space-y-4">
                {groupedAmenities.map((group) => (
                  <div key={group.key}>
                    {/* The label only earns its space once there is more than
                        one group to tell apart. */}
                    {groupedAmenities.length > 1 ? (
                      <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/45">
                        {t(`amenityGroups.${group.key}`)}
                      </h3>
                    ) : null}
                    <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                      {group.items.map((amenity) => {
                        const Icon = amenityIcon(amenity);
                        return (
                          <li key={amenity} className="flex items-center gap-2.5 text-sm text-foreground/80 sm:text-[15px]">
                            <Icon className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                            {/* `t` has no fallback argument, and an unknown key
                                would render the key itself — so free-text
                                amenities from imported posts print verbatim. */}
                            <span className="min-w-0 break-words">
                              {isKnownAmenity(amenity) ? t(`amenities.${amenity}`) : amenity}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* --- 7: description, ABOVE the host card and the map ------------ */}
          {listing.description?.trim() ? (
            <section aria-labelledby="about-heading" className="lg:col-start-1 lg:row-start-3">
              <h2 id="about-heading" className="font-heading text-lg font-semibold sm:text-xl">
                {t("listingDetail.aboutTitle")}
              </h2>
              <div className="mt-3">
                <ListingDescription
                  description={listing.description}
                  showMoreLabel={t("listingDetail.showMore")}
                  showLessLabel={t("listingDetail.showLess")}
                />
              </div>
            </section>
          ) : null}

          {/* --- 8: contact -------------------------------------------------
              Inline here on mobile (right after the description, where a reader
              is ready to act); on lg+ the same card is the sticky sidebar. */}
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-24 lg:self-start">
            {ownerCard}
          </div>

          {/* --- 9: location ------------------------------------------------ */}
          <section aria-labelledby="location-heading" className="lg:col-start-1 lg:row-start-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="location-heading" className="font-heading text-lg font-semibold sm:text-xl">
                {t("listingDetail.locationTitle")}
              </h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                {t("listingDetail.openInMaps")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <p className="mt-1.5 break-words text-sm text-foreground/60">{mapQuery || location}</p>

            {/* Halved from 260/360px. The map answers "roughly where", and the
                full-screen Maps link above covers real exploration — so it no
                longer costs most of a phone screen to scroll past. */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-muted">
              {listing.lat != null && listing.lng != null ? (
                <div className="h-[170px] w-full sm:h-[220px]">
                  <LazyMap
                    markers={[
                      {
                        id: listing.id,
                        lat: listing.lat,
                        lng: listing.lng,
                        title: listing.title,
                        price: formatCurrency(listing.monthlyRent),
                        district: listing.district,
                        university: listing.university
                      }
                    ]}
                    zoom={15}
                  />
                </div>
              ) : (
                <iframe
                  title={`Map for ${listing.title}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                  className="h-[170px] w-full border-0 sm:h-[220px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>

            <p className="mt-2 text-xs text-foreground/50">{t("listingDetail.locationNote")}</p>
          </section>

          {/* --- 10: similar listings --------------------------------------- */}
          {similarListings.length ? (
            <section aria-labelledby="similar-heading" className="lg:col-start-1 lg:row-start-5">
              <h2 id="similar-heading" className="font-heading text-lg font-semibold sm:text-xl">
                {t("listingDetail.similarListings")}
              </h2>
              <div className="mt-3.5">
                <ListingGrid listings={similarListings} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/** One key-fact cell. `dt`/`dd` so the label-value pairing is real semantics. */
function Fact({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
        <span className="text-primary/70" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground sm:text-[15px]">{value}</dd>
    </div>
  );
}

/** Buckets a listing's amenities into the display groups, preserving order. */
function groupAmenities(amenities: string[]) {
  const remaining = new Set(amenities);
  const groups: Array<{ key: string; items: string[] }> = [];

  for (const [key, members] of Object.entries(AMENITY_GROUPS)) {
    const items = members.filter((amenity) => remaining.has(amenity));
    items.forEach((amenity) => remaining.delete(amenity));
    if (items.length) groups.push({ key, items });
  }

  // Anything the listing carries that isn't a known amenity still gets shown —
  // imported posts contain free-text extras and dropping them loses real detail.
  if (remaining.size) groups.push({ key: "other", items: [...remaining] });

  return groups;
}
