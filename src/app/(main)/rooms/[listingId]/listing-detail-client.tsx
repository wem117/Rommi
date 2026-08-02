"use client";

import {
  CalendarDays,
  ExternalLink,
  Heart,
  Home,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  UserCircle
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ListingGallery } from "@/components/listings/listing-gallery";
import { ListingGrid } from "@/components/listings/listing-grid";
import { LazyMap } from "@/components/map/lazy-map";
import { ContactLinks } from "@/components/shared/contact-links";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { createConversation } from "@/hooks/use-conversations";
import { useFavorites } from "@/hooks/use-favorites";
import { useListing } from "@/hooks/use-listing";
import { useListings } from "@/hooks/use-listings";
import {
  getProfileById,
  recordContactedListing,
  recordViewedListing
} from "@/lib/data/profiles";
import { formatCurrency, formatDate, formatListingPrice } from "@/lib/utils/format";
import { rankSimilarListings } from "@/lib/utils/similar-listings";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

const KNOWN_AMENITIES = new Set([
  "WiFi",
  "Parking",
  "AC",
  "Kitchen",
  "Washing Machine",
  "Gym",
  "Security",
  "Furnished",
  "Balcony",
  "Hot Water"
]);

export default function ListingDetailClient({
  listingId,
  initialListing,
  ownerContacts
}: {
  listingId: string;
  initialListing: Listing | null;
  /** WhatsApp/Instagram, resolved server-side (see lib/data/public-contacts). */
  ownerContacts?: { whatsapp: string; instagram: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const listingTypeLabels = {
    private_room: t("listingDetail.privateRoom"),
    shared_room: t("listingDetail.sharedRoom"),
    entire_place: t("listingDetail.entirePlace")
  } as const;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { listing, loading, error } = useListing(listingId, initialListing);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  // Deliberately NOT filtered by city: rankSimilarListings scores city highest,
  // so same-city results still come first, but a city with a single listing
  // still gets suggestions instead of an empty section.
  const related = useListings(listing ? { sort: "newest" } : {});

  useEffect(() => {
    let cancelled = false;

    async function loadOwner() {
      if (!listing?.ownerId) return;
      const nextOwner = await getProfileById(listing.ownerId);
      if (!cancelled) setOwner(nextOwner);
    }

    void loadOwner();
    return () => {
      cancelled = true;
    };
  }, [listing?.ownerId]);

  async function handleMessage() {
    if (!listing || !owner) return;
    if (!user) {
      router.push(`/sign-in?redirect=/rooms/${listing.id}`);
      return;
    }

    setMessageLoading(true);
    try {
      const conversationId = await createConversation({
        participantIds: [user.uid, owner.uid],
        listingId: listing.id,
        listingTitle: listing.title
      });
      router.push(`/inbox/${conversationId}`);
    } finally {
      setMessageLoading(false);
    }
  }

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

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10">{t("listingDetail.loadingListing")}</main>;
  }

  if (error || !listing) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-soft">{t("listingDetail.listingNotFound")}</div>
      </main>
    );
  }

  const relatedListings = rankSimilarListings(listing, related.listings);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ListingGallery photos={listing.photoUrls} title={listing.title} />

      {/*
        Three grid children so the single owner <aside> can sit between
        Amenities and Location in the mobile stacking order (Airbnb-style),
        while explicit lg: column/row placement keeps the desktop layout
        unchanged: main content left, sticky owner sidebar right.
      */}
      <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-8 lg:col-start-1 lg:row-start-1">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#dff8f1] px-3 py-1.5 text-xs font-semibold text-[#0d8f7a] sm:px-4 sm:py-2 sm:text-sm">
                {listingTypeLabels[listing.listingType]}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold leading-tight sm:mt-5 sm:text-4xl">{listing.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-foreground/60 sm:mt-3 sm:text-lg">
              <MapPin className="h-4 w-4 text-[#a98272] sm:h-5 sm:w-5" />
              {listing.city}
              {listing.district ? `, ${listing.district}` : ""}
            </p>

            {/* Price first — the number renters scan for. */}
            <div className="mt-4 rounded-2xl bg-[#f7f1e7] px-4 py-4 sm:mt-6 sm:rounded-[2rem] sm:px-6 sm:py-6">
              <div className="text-2xl font-bold text-foreground sm:text-4xl">
                {formatCurrency(listing.monthlyRent)}
                <span className="ml-1 text-sm font-medium text-foreground/70 sm:text-xl">{t("listingDetail.perMonth")}</span>
              </div>
              {listing.depositRequired ? (
                <p className="mt-1.5 text-sm font-semibold text-[#8e6f5e] sm:mt-2 sm:text-base">
                  {t("listingDetail.depositPrefix")} {formatCurrency(listing.depositAmount)} {t("listingDetail.depositSuffix")}
                </p>
              ) : (
                <p className="mt-1.5 text-sm font-semibold text-[#8e6f5e] sm:mt-2 sm:text-base">{t("listingDetail.noDeposit")}</p>
              )}
            </div>

            {/* Key facts immediately after price. */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 xl:grid-cols-4">
              <InfoCard icon={<Home className="h-5 w-5" />} label={t("listingDetail.bedrooms")} value={`${listing.bedrooms}`} />
              <InfoCard label={t("listingDetail.bathrooms")} value={`${listing.bathrooms}`} />
              <InfoCard icon={<CalendarDays className="h-5 w-5" />} label={t("listingDetail.available")} value={formatDate(listing.availableFrom, locale)} />
              <InfoCard label={t("listingDetail.type")} value={listingTypeLabels[listing.listingType]} />
            </div>

            <div className="mt-6 sm:mt-8">
              <h2 className="text-lg font-bold sm:text-2xl">{t("listingDetail.amenitiesTitle")}</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3">
                {listing.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2.5 rounded-xl bg-[#f7f1e7] px-3.5 py-2.5 text-sm font-medium sm:rounded-[1.25rem] sm:px-5 sm:py-3 sm:text-base"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#d2d0c6] text-primary sm:h-9 sm:w-9 sm:rounded-xl">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    {KNOWN_AMENITIES.has(amenity) ? t(`amenities.${amenity}`) : amenity}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start">
            <section className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9c7364]">
                {t("listingDetail.currentRoommate")}
              </h2>

              <div className="mt-4 flex items-center gap-3 sm:mt-5 sm:gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-full bg-background sm:h-16 sm:w-16">
                  {owner?.photoURL ? (
                    <Image src={owner.photoURL} alt={owner.fullName} fill className="object-cover" sizes="64px" />
                  ) : (
                    <UserCircle className="h-full w-full text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold sm:text-2xl">{owner?.fullName ?? t("listingDetail.listingOwnerFallback")}</h3>
                    <VerifiedBadge verified={owner?.verified} />
                  </div>
                  <p className="text-sm text-foreground/60 sm:text-lg">
                    {owner?.age ? `${owner.age} ${t("listingDetail.yearsOld")}` : t("listingDetail.roomiMember")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (user?.uid) void recordContactedListing(user.uid, listing.id);
                  void handleMessage();
                }}
                disabled={messageLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0d856f] disabled:opacity-60 sm:mt-6 sm:py-4 sm:text-lg"
              >
                <Mail className="h-5 w-5" />
                {messageLoading ? t("listingDetail.openingChat") : t("listingDetail.messageOwner")}
              </button>

              {owner?.email ? (
                <a
                  href={`mailto:${owner.email}`}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#eadfce] px-5 py-3 text-sm font-medium text-foreground/70 transition hover:bg-[#faf6ef]"
                >
                  {t("listingDetail.orEmailDirectly")}
                </a>
              ) : null}

              {owner && !owner.contactsHidden ? (
                <div className="mt-3 flex justify-center">
                  <ContactLinks
                    telegram={owner.telegram}
                    phone={owner.phone}
                    whatsapp={ownerContacts?.whatsapp}
                    instagram={ownerContacts?.instagram}
                    contactsHidden={owner.contactsHidden}
                    size="sm"
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void toggleFavorite(listing.id)}
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition sm:mt-4 sm:py-4 sm:text-lg ${
                  isFavorite(listing.id)
                    ? "bg-primary text-white"
                    : "bg-[#f7f1e7] text-foreground/75 hover:bg-[#efe5d9]"
                }`}
              >
                <Heart className={`h-5 w-5 ${isFavorite(listing.id) ? "fill-current" : ""}`} />
                {isFavorite(listing.id) ? t("listingDetail.saved") : t("listingDetail.saveListing")}
              </button>

              <div className="mt-4 border-t border-[#efe5d9] pt-4 text-sm text-foreground/70 sm:mt-6 sm:pt-6 sm:text-base">
                <div className="flex items-center justify-between">
                  <span>{t("listingDetail.listed")}</span>
                  <span className="font-semibold text-foreground">{formatDate(listing.createdAt, locale)}</span>
                </div>
              </div>
            </section>

            {user?.uid === listing.ownerId ? (
              <Link
                href={`/listings/${listing.id}/edit`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold shadow-soft"
              >
                <Pencil className="h-4 w-4" />
                {t("listingDetail.editListing")}
              </Link>
            ) : null}

            <section className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
              <h3 className="text-base font-bold sm:text-lg">{t("listingDetail.listingSummary")}</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/65 sm:mt-3 sm:leading-7">
                {formatListingPrice(listing.monthlyRent, listing.depositRequired, listing.depositAmount)}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/65 sm:mt-3 sm:leading-7">
                {listing.preferences.genderPreference === "any"
                  ? t("listingDetail.anyGenderPreference")
                  : `${t("listingDetail.preferredGenderPrefix")} ${t(
                      listing.preferences.genderPreference === "male" ? "listingForm.male" : "listingForm.female"
                    )}`}
              </p>
            </section>
          </aside>

          <div className="space-y-6 sm:space-y-8 lg:col-start-1 lg:row-start-2">
          <section className="rounded-2xl bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold sm:text-2xl">{t("listingDetail.locationTitle")}</h2>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#e6d8c6] bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  {t("listingDetail.openInMaps")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-[#eadfce] bg-[#f7f1e7] sm:mt-4 sm:rounded-[2rem]">
                {listing.lat != null && listing.lng != null ? (
                  <div className="h-[260px] w-full sm:h-[360px]">
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
                    className="h-[260px] w-full border-0 sm:h-[360px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
              </div>
            </div>

            {/* Description last — facts above are what renters scan first. */}
            <div className="mt-6 sm:mt-8">
              <h2 className="text-lg font-bold sm:text-2xl">{t("listingDetail.aboutTitle")}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground/75 sm:mt-4 sm:text-base sm:leading-7">
                {listing.description}
              </p>
            </div>
          </section>

          {relatedListings.length ? (
            <section>
              <h2 className="text-xl font-bold sm:text-3xl">{t("listingDetail.similarListings")}</h2>
              <div className="mt-4 sm:mt-5">
                <ListingGrid listings={relatedListings} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[#f7f1e7] p-3 text-center sm:rounded-[1.5rem] sm:p-5">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#9c7364] sm:gap-2 sm:text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-lg font-bold sm:mt-3 sm:text-2xl">{value}</div>
    </div>
  );
}
