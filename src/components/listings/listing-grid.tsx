import { ListingCard } from "@/components/listings/listing-card";
import type { Listing } from "@/types/listing";

export function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
