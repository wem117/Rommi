import { BedDouble, CalendarDays, MapPin, ShowerHead } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatDate, formatMonthlyRent } from "@/lib/utils/format";
import type { Listing } from "@/types/listing";

const propertyLabels: Record<Listing["propertyType"], string> = {
  apartment: "Apartment",
  house: "House",
  dorm: "Dorm",
  studio: "Studio"
};

const listingTypeLabels: Record<Listing["listingType"], string> = {
  private_room: "Private room",
  shared_room: "Shared room",
  entire_place: "Entire place"
};

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photoUrls[0];

  return (
    <Link
      href={`/rooms/${listing.id}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-background">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-foreground/45">
            No photo
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
          {listingTypeLabels[listing.listingType]}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-2 font-heading text-lg font-bold">{listing.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-foreground/60">
              <MapPin className="h-4 w-4" />
              {listing.city}
              {listing.district ? `, ${listing.district}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right font-heading text-lg font-bold text-primary">
            {formatMonthlyRent(listing.monthlyRent)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-foreground/65">
          <span className="rounded-full bg-background px-3 py-1">{propertyLabels[listing.propertyType]}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1">
            <BedDouble className="h-3.5 w-3.5" />
            {listing.bedrooms} bed
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1">
            <ShowerHead className="h-3.5 w-3.5" />
            {listing.bathrooms} bath
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(listing.availableFrom)}
          </span>
        </div>
      </div>
    </Link>
  );
}
