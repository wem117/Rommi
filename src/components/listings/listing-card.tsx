"use client";

import { BedDouble, CalendarDays, GraduationCap, ImageOff, MapPin, ShowerHead, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { createConversation } from "@/hooks/use-conversations";
import { useLocale } from "@/context/locale-context";
import { demoProfiles } from "@/lib/data/demo";
import { recordContactedListing } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatDate, formatListingPrice } from "@/lib/utils/format";
import type { Listing } from "@/types/listing";
import { useAuth } from "@/context/auth-context";
import { hasStatedAge } from "@/lib/utils/profile-display";
import { useRouter } from "next/navigation";

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photoUrls[0];
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  // The inline "current roommate" block is demo-mode-only: demoProfiles must
  // never be shown against real Supabase listings.
  const owner = isSupabaseConfigured ? null : demoProfiles.find((profile) => profile.uid === listing.ownerId);
  const propertyLabels: Record<Listing["propertyType"], string> = {
    apartment: t("listing.types.apartment"),
    house: t("listing.types.house"),
    dorm: t("listing.types.dorm"),
    studio: t("listing.types.studio")
  };
  const listingTypeLabels: Record<Listing["listingType"], string> = {
    private_room: t("listing.types.privateRoom"),
    shared_room: t("listing.types.sharedRoom"),
    entire_place: t("listing.types.entirePlace")
  };
  const propertyBadge =
    listing.propertyType === "apartment" || listing.propertyType === "studio"
      ? propertyLabels[listing.propertyType]
      : listingTypeLabels[listing.listingType];
  // "New" = created within the last 48 hours. `Date.now()` differs between the
  // server and the client, so reading it during render would risk a hydration
  // mismatch on listings near the 48h boundary. We resolve "now" only after
  // mount: the server and the first client render both show no badge (matching
  // HTML), then the badge appears client-side for genuinely-new listings.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const isNew = now !== null && now - listing.createdAt.getTime() < 48 * 60 * 60 * 1000;

  return (
    <Link
      href={`/rooms/${listing.id}`}
      className="group overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-[180px] overflow-hidden bg-background sm:h-[220px]">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          // Designed placeholder for photo-less listings — never a broken image.
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-muted to-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ImageOff className="h-4 w-4 text-primary/60" />
            </span>
            <span className="text-sm font-medium text-foreground/45">{t("listing.noPhoto")}</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur sm:px-3 sm:py-1.5">
            {propertyBadge}
          </div>
          {listing.featured ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold text-highlight-foreground shadow-sm sm:px-3 sm:py-1.5">
              <Sparkles className="h-3 w-3" />
              {t("listing.featured")}
            </div>
          ) : null}
        </div>

        {isNew ? (
          <div className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm sm:px-3 sm:py-1.5">
            {t("listing.new")}
          </div>
        ) : null}

        <div className="absolute bottom-3 right-3">
          <FavoriteButton listingId={listing.id} />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Price leads (Krisha/Airbnb hierarchy), then title and location. */}
        <div className="text-lg font-bold leading-none text-primary sm:text-xl">
          {formatListingPrice(listing.monthlyRent, listing.depositRequired, listing.depositAmount)}
        </div>

        <h3 className="mt-1.5 line-clamp-1 font-heading text-sm font-semibold text-foreground sm:text-base">
          {listing.title}
        </h3>

        <div className="mt-1 flex items-center gap-1 text-xs text-foreground/55">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">
            {listing.city}
            {listing.district ? `, ${listing.district}` : ""}
          </span>
        </div>

        {listing.university ? (
          <div className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:mt-2">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{listing.university}</span>
          </div>
        ) : null}

        {owner ? (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-surface-muted p-1.5 sm:mt-3 sm:gap-3 sm:p-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-background">
              {owner.photoURL ? (
                <Image src={owner.photoURL} alt={owner.fullName} fill className="object-cover" sizes="32px" />
              ) : (
                <div className="grid h-full place-items-center text-xs font-bold text-primary">
                  {owner.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              {/* A host seeded from a Telegram/OLX post usually has no age;
                  ", 0" after the name reads as broken data. */}
              <div className="text-xs font-semibold text-foreground">
                {hasStatedAge(owner.age) ? `${owner.fullName}, ${owner.age}` : owner.fullName}
              </div>
              <p className="text-xs text-foreground/50">{t("listing.currentRoommate")}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-4 text-xs text-foreground/55 sm:mt-3">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {listing.bedrooms} {t("shared.bedroomsAbbrev")}
          </span>
          <span className="inline-flex items-center gap-1">
            <ShowerHead className="h-3.5 w-3.5" />
            {listing.bathrooms} {t("shared.bathroomsAbbrev")}
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(listing.availableFrom, locale)}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-4">
          {propertyLabels[listing.propertyType] ? (
            <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground/65">
              {propertyLabels[listing.propertyType]}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              if (!user) return router.push(`/sign-in?redirect=/rooms/${listing.id}`);
              try {
                const id = await createConversation({
                  participantIds: [user.uid, listing.ownerId],
                  listingId: listing.id,
                  listingTitle: listing.title
                });
                await recordContactedListing(user.uid, listing.id);
                router.push(`/inbox/${id}`);
              } catch (err) {
                console.error(err);
              }
            }}
            className="rounded-xl bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95 sm:py-2"
          >
            {t("listing.message")}
          </button>
        </div>
      </div>
    </Link>
  );
}
