import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getListingByIdServer, getListingsPageServer } from "@/lib/data/listings-server";
import { getPublicProfileByIdServer } from "@/lib/data/profiles-server";
import { getPublicContacts } from "@/lib/data/public-contacts";
import { requirePageAuth } from "@/lib/supabase/page-auth";
import { siteConfig } from "@/lib/site-config";
import { formatCurrency } from "@/lib/utils/format";
import { rankSimilarListings } from "@/lib/utils/similar-listings";

import ListingDetailClient from "./listing-detail-client";

// Auth-gated detail page: guests are redirected to sign-in (see the server auth
// guard in the default export). It is still server-rendered for signed-in users
// (fast first paint), but per-user, so it renders dynamically rather than via
// shared ISR.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingId } = await params;
  const listing = await getListingByIdServer(listingId);

  if (!listing) {
    return { title: "Listing not found", robots: { index: false, follow: false } };
  }

  const location = [listing.district, listing.city].filter(Boolean).join(", ");
  const title = `${listing.title} — ${formatCurrency(listing.monthlyRent)}/mo${location ? ` in ${location}` : ""}`;
  const description =
    listing.description.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Room for rent in ${listing.city}, Kazakhstan on ${siteConfig.name}.`;
  const canonical = `/rooms/${listing.id}`;
  const image = listing.photoUrls?.[0];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${siteConfig.url}${canonical}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: listing.title }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined
    }
  };
}

export default async function Page({ params }: PageProps) {
  const { listingId } = await params;

  // Server-side authorization: guests are redirected to sign-in with a return
  // URL. Runs before any listing data is fetched or rendered, so a detail URL
  // cannot be opened directly by an unauthenticated visitor.
  await requirePageAuth(`/rooms/${listingId}`);

  const listing = await getListingByIdServer(listingId);

  if (!listing) notFound();

  // Everything the page needs, resolved server-side and in parallel.
  //
  // The owner profile and the "similar listings" pool used to be fetched from
  // effects inside the client component, which cost two extra round-trips AFTER
  // hydration and left the contact card — the page's primary call to action —
  // rendering empty until the profile arrived, moving the layout when it did.
  // Both are static per listing, so the server is the right place for them.
  //
  // Promise.all, not sequential awaits: these three are independent, and on a
  // force-dynamic page every serial round-trip is added directly to TTFB.
  const [ownerContacts, owner, similarPool] = await Promise.all([
    // WhatsApp and Instagram have no column on `profiles`, so they are read
    // here, server-side, behind the auth guard above — the same "signed-in
    // visitors only" rule the telegram/phone columns follow at the database.
    getPublicContacts(listing.ownerId),
    getPublicProfileByIdServer(listing.ownerId),
    // Deliberately unfiltered by city: rankSimilarListings scores city highest,
    // so same-city results still lead, but a city with one listing still gets
    // suggestions instead of an empty section.
    getListingsPageServer({ sort: "newest" }, 1, 12)
  ]);

  const similarListings = rankSimilarListings(listing, similarPool.listings);

  // Product/Offer structured data for rich results.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description.slice(0, 500),
    image: listing.photoUrls?.slice(0, 5) ?? [],
    offers: {
      "@type": "Offer",
      price: listing.monthlyRent,
      priceCurrency: "KZT",
      availability: "https://schema.org/InStock",
      url: `${siteConfig.url}/rooms/${listing.id}`
    },
    areaServed: listing.city
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <ListingDetailClient
        listingId={listing.id}
        initialListing={listing}
        owner={owner}
        ownerContacts={ownerContacts}
        similarListings={similarListings}
      />
    </>
  );
}
