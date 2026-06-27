"use client";

import { CalendarDays, Home, Mail, MapPin, Pencil, UserCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ListingGallery } from "@/components/listings/listing-gallery";
import { ListingGrid } from "@/components/listings/listing-grid";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAuth } from "@/context/auth-context";
import {
  getProfileById,
  recordContactedListing,
  recordViewedListing
} from "@/lib/data/profiles";
import { formatDate, formatListingPrice } from "@/lib/utils/format";
import { useListing } from "@/hooks/use-listing";
import { useListings } from "@/hooks/use-listings";
import type { UserProfile } from "@/types/user";

export default function ListingDetailPage() {
  const params = useParams<{ listingId: string }>();
  const { user } = useAuth();
  const { listing, loading, error } = useListing(params.listingId);
  const [owner, setOwner] = useState<UserProfile | null>(null);
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

  useEffect(() => {
    if (!user?.uid || !listing?.id) return;
    void recordViewedListing(user.uid, listing.id);
  }, [listing?.id, user?.uid]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10">Loading listing...</main>;
  }

  if (error || !listing) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-white p-8 shadow-soft">Listing not found.</div>
      </main>
    );
  }

  const relatedListings = related.listings.filter((item) => item.id !== listing.id).slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ListingGallery photos={listing.photoUrls} title={listing.title} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold">{listing.title}</h1>
              <p className="mt-2 flex items-center gap-2 text-foreground/65">
                <MapPin className="h-4 w-4" />
                {listing.address}, {listing.city}
                {listing.district ? `, ${listing.district}` : ""}
              </p>
            </div>
            <div className="text-right text-2xl font-bold text-primary">
              {formatListingPrice(listing.monthlyRent, listing.depositRequired, listing.depositAmount)}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Info icon={<Home className="h-4 w-4" />} label="Type" value={listing.listingType.replaceAll("_", " ")} />
            <Info label="Bedrooms" value={`${listing.bedrooms}`} />
            <Info label="Bathrooms" value={`${listing.bathrooms}`} />
            <Info icon={<CalendarDays className="h-4 w-4" />} label="Available" value={formatDate(listing.availableFrom)} />
            <Info label="Property" value={listing.propertyType} />
            <Info label="Preference" value={listing.preferences.genderPreference} />
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold">Description</h2>
            <p className="mt-3 whitespace-pre-line leading-7 text-foreground/70">{listing.description}</p>
          </div>

          {listing.amenities.length ? (
            <div className="mt-8">
              <h2 className="text-xl font-bold">Amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.amenities.map((amenity) => (
                  <span key={amenity} className="rounded-full bg-background px-3 py-1 text-sm font-medium">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <UserCircle className="h-12 w-12 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-bold">{owner?.fullName ?? "Listing owner"}</h2>
                  <VerifiedBadge verified={owner?.verified} />
                </div>
                <p className="text-sm text-foreground/60">{owner?.university ?? "Roommate KZ member"}</p>
              </div>
            </div>
            {owner?.bio ? <p className="mt-4 text-sm leading-6 text-foreground/65">{owner.bio}</p> : null}
            {owner?.email ? (
              <a
                href={`mailto:${owner.email}`}
                onClick={() => {
                  if (!user?.uid) return;
                  void recordContactedListing(user.uid, listing.id);
                }}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                <Mail className="h-4 w-4" />
                Contact owner
              </a>
            ) : null}
          </section>

          {user?.uid === listing.ownerId ? (
            <Link
              href={`/listings/${listing.id}/edit`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold shadow-soft"
            >
              <Pencil className="h-4 w-4" />
              Edit listing
            </Link>
          ) : null}
        </aside>
      </div>

      {relatedListings.length ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Related listings</h2>
          <div className="mt-5">
            <ListingGrid listings={relatedListings} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="flex items-center gap-1 text-xs font-semibold uppercase text-foreground/50">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-semibold capitalize">{value}</div>
    </div>
  );
}
