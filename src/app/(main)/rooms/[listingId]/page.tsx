import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getListingByIdServer } from "@/lib/data/listings-server";
import { siteConfig } from "@/lib/site-config";
import { formatCurrency } from "@/lib/utils/format";

import ListingDetailClient from "./listing-detail-client";

// Server-rendered + ISR: the page HTML (title, price, description, photos) is
// generated on the server and cached, so crawlers and first paint get real
// content instead of an empty client shell. Revalidates periodically to pick up
// edits/removals.
export const revalidate = 300;

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
  const listing = await getListingByIdServer(listingId);

  if (!listing) notFound();

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
      <ListingDetailClient listingId={listing.id} initialListing={listing} />
    </>
  );
}
