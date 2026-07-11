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
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ListingGallery } from "@/components/listings/listing-gallery";
import { ListingGrid } from "@/components/listings/listing-grid";
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

export default function ListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();
  const listingTypeLabels = {
    private_room: t("listingDetail.privateRoom"),
    shared_room: t("listingDetail.sharedRoom"),
    entire_place: t("listingDetail.entirePlace")
  } as const;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { listing, loading, error } = useListing(params.listingId);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const related = useListings(listing ? { city: listing.city, sort: "newest" } : {});

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
    return `${listing.address}, ${listing.city}${listing.district ? `, ${listing.district}` : ""}`;
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

  const relatedListings = related.listings.filter((item) => item.id !== listing.id).slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ListingGallery photos={listing.photoUrls} title={listing.title} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#dff8f1] px-4 py-2 text-sm font-semibold text-[#0d8f7a]">
                {listingTypeLabels[listing.listingType]}
              </span>
              <span className="rounded-full bg-[#fde8c9] px-4 py-2 text-sm font-semibold text-[#b97716]">{t("listingDetail.today")}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e7fbeb] px-4 py-2 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                {t("listingDetail.verified")}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold sm:text-5xl">{listing.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-lg text-foreground/60">
              <MapPin className="h-5 w-5 text-[#a98272]" />
              {listing.city}
              {listing.district ? `, ${listing.district}` : ""}
            </p>

            <div className="mt-8 rounded-[2rem] bg-[#f7f1e7] px-6 py-7">
              <div className="text-3xl font-bold text-foreground sm:text-5xl">
                {formatCurrency(listing.monthlyRent)}
                <span className="ml-1 text-xl font-medium text-foreground/70">{t("listingDetail.perMonth")}</span>
              </div>
              {listing.depositRequired ? (
                <p className="mt-3 text-base font-semibold text-[#8e6f5e]">
                  {t("listingDetail.depositPrefix")} {formatCurrency(listing.depositAmount)} {t("listingDetail.depositSuffix")}
                </p>
              ) : (
                <p className="mt-3 text-base font-semibold text-[#8e6f5e]">{t("listingDetail.noDeposit")}</p>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold">{t("listingDetail.aboutTitle")}</h2>
              <p className="mt-4 whitespace-pre-line text-lg leading-9 text-foreground/75">{listing.description}</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard icon={<Home className="h-5 w-5" />} label={t("listingDetail.bedrooms")} value={`${listing.bedrooms}`} />
              <InfoCard label={t("listingDetail.bathrooms")} value={`${listing.bathrooms}`} />
              <InfoCard icon={<CalendarDays className="h-5 w-5" />} label={t("listingDetail.available")} value={formatDate(listing.availableFrom)} />
              <InfoCard label={t("listingDetail.type")} value={listingTypeLabels[listing.listingType]} />
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold">{t("listingDetail.amenitiesTitle")}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {listing.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 rounded-[1.5rem] bg-[#f7f1e7] px-5 py-4 text-lg font-medium"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d2d0c6] text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    {KNOWN_AMENITIES.has(amenity) ? t(`amenities.${amenity}`) : amenity}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">{t("listingDetail.locationTitle")}</h2>
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

              <div className="mt-4 overflow-hidden rounded-[2rem] border border-[#eadfce] bg-[#f7f1e7]">
                <iframe
                  title={`Map for ${listing.title}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                  className="h-[360px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </section>

          {relatedListings.length ? (
            <section>
              <h2 className="text-3xl font-bold">{t("listingDetail.similarListings")}</h2>
              <div className="mt-5">
                <ListingGrid listings={relatedListings} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-[2rem] border border-[#eadfce] bg-white p-6 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#9c7364]">
              {t("listingDetail.currentRoommate")}
            </h2>

            <div className="mt-5 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-background">
                {owner?.photoURL ? (
                  <Image src={owner.photoURL} alt={owner.fullName} fill className="object-cover" sizes="64px" />
                ) : (
                  <UserCircle className="h-full w-full text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{owner?.fullName ?? t("listingDetail.listingOwnerFallback")}</h3>
                  <VerifiedBadge verified={owner?.verified} />
                </div>
                <p className="text-lg text-foreground/60">
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
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-5 py-4 text-lg font-semibold text-white transition hover:bg-[#0d856f] disabled:opacity-60"
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

            <button
              type="button"
              onClick={() => void toggleFavorite(listing.id)}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-lg font-medium transition ${
                isFavorite(listing.id)
                  ? "bg-primary text-white"
                  : "bg-[#f7f1e7] text-foreground/75 hover:bg-[#efe5d9]"
              }`}
            >
              <Heart className={`h-5 w-5 ${isFavorite(listing.id) ? "fill-current" : ""}`} />
              {isFavorite(listing.id) ? t("listingDetail.saved") : t("listingDetail.saveListing")}
            </button>

            <div className="mt-6 border-t border-[#efe5d9] pt-6 text-base text-foreground/70">
              <div className="flex items-center justify-between">
                <span>{t("listingDetail.responseRate")}</span>
                <span className="font-semibold text-foreground">98%</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span>{t("listingDetail.responseTime")}</span>
                <span className="font-semibold text-foreground">{t("listingDetail.withinTwoHours")}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span>{t("listingDetail.listed")}</span>
                <span className="font-semibold text-foreground">{formatDate(listing.createdAt)}</span>
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

          <section className="rounded-[2rem] border border-[#eadfce] bg-white p-6 shadow-soft">
            <h3 className="text-lg font-bold">{t("listingDetail.listingSummary")}</h3>
            <p className="mt-3 text-sm leading-7 text-foreground/65">
              {formatListingPrice(listing.monthlyRent, listing.depositRequired, listing.depositAmount)}
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground/65">
              {listing.preferences.genderPreference === "any"
                ? t("listingDetail.anyGenderPreference")
                : `${t("listingDetail.preferredGenderPrefix")} ${listing.preferences.genderPreference}.`}
            </p>
          </section>
        </aside>
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
    <div className="rounded-[1.5rem] bg-[#f7f1e7] p-5 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#9c7364]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}
