import { BedDouble, CalendarDays, MapPin, ShieldCheck, ShowerHead } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { createConversation } from "@/hooks/use-conversations";
import { useLocale } from "@/context/locale-context";
import { demoProfiles } from "@/lib/data/demo";
import { recordContactedListing } from "@/lib/data/profiles";
import { formatDate, formatListingPrice } from "@/lib/utils/format";
import type { Listing } from "@/types/listing";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photoUrls[0];
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const owner = demoProfiles.find((profile) => profile.uid === listing.ownerId);
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
  const statusBadge =
    listing.monthlyRent >= 220000
      ? t("listing.availableSoon")
      : listing.monthlyRent <= 120000
        ? t("listing.availableFlexible")
        : t("listing.availableToday");
  const propertyBadge =
    listing.propertyType === "apartment" || listing.propertyType === "studio"
      ? propertyLabels[listing.propertyType]
      : listingTypeLabels[listing.listingType];

  return (
    <Link
      href={`/rooms/${listing.id}`}
      className="group overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-[220px] overflow-hidden bg-background">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-foreground/45">
            {t("listing.noPhoto")}
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
            {propertyBadge}
          </div>
          {listing.monthlyRent >= 150000 ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
              <ShieldCheck className="h-3 w-3" />
              {t("listing.verified")}
            </div>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm">
          {statusBadge}
        </div>

        <div className="absolute bottom-3 right-3">
          <FavoriteButton listingId={listing.id} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 font-heading text-sm font-semibold text-foreground sm:text-base">
            {listing.title}
          </h3>
          <span className="shrink-0 text-right text-sm font-bold text-primary">
            {formatListingPrice(listing.monthlyRent, listing.depositRequired, listing.depositAmount)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-foreground/55">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">
            {listing.city}
            {listing.district ? `, ${listing.district}` : ""}
          </span>
        </div>

        {owner ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-muted p-2">
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
              <div className="text-xs font-semibold text-foreground">
                {owner.fullName}, {owner.age}
              </div>
              <p className="text-xs text-foreground/50">{t("listing.currentRoommate")}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-4 text-xs text-foreground/55">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {listing.bedrooms} bd
          </span>
          <span className="inline-flex items-center gap-1">
            <ShowerHead className="h-3.5 w-3.5" />
            {listing.bathrooms} ba
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(listing.availableFrom)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground/65">
            {propertyLabels[listing.propertyType]}
          </span>
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
            className="rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {t("listing.message")}
          </button>
        </div>
      </div>
    </Link>
  );
}
