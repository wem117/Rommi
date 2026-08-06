import type { Listing } from "@/types/listing";

/**
 * Orders candidate listings by how close they are to the one being viewed.
 *
 * Every signal is SCORED, never used as a filter. The brief asks to *prefer*
 * same city, budget and type, and preference is what this is: on a young
 * marketplace a hard filter empties the section entirely — with listings spread
 * one-per-city, a city filter leaves nothing at all — and an empty section is
 * worse than a loosely related one.
 *
 * Weights reflect what a renter actually substitutes between: city dominates
 * (nobody moves to another city for a room), then the kind of place, then a
 * comparable price, then the district.
 */
export function rankSimilarListings(current: Listing, candidates: Listing[], limit = 3): Listing[] {
  const rent = current.monthlyRent || 0;

  return candidates
    .filter((item) => item.id !== current.id)
    .map((item) => {
      let score = 0;
      // City outweighs everything else combined, so a same-city listing always
      // sorts above a cross-city one however well the latter matches otherwise.
      if (item.city === current.city) score += 20;
      if (item.listingType === current.listingType) score += 3;
      if (item.propertyType === current.propertyType) score += 2;
      if (current.district && item.district === current.district) score += 1;

      // Within 25% of the asking rent counts as the same budget bracket; the
      // partial credit below keeps near-misses ahead of wildly different prices.
      // Both prices have to be known for "same budget bracket" to mean
      // anything; an unpriced listing simply scores nothing here rather than
      // being treated as free and matching every cheap search.
      if (rent > 0 && item.monthlyRent != null && item.monthlyRent > 0) {
        const delta = Math.abs(item.monthlyRent - rent) / rent;
        if (delta <= 0.25) score += 3;
        else if (delta <= 0.5) score += 1;
      }

      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
