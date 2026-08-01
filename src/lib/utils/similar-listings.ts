import type { Listing } from "@/types/listing";

/**
 * Orders candidate listings by how close they are to the one being viewed.
 *
 * The query already restricts to the same city (the strongest signal a renter
 * cares about), so ranking here refines within that set rather than re-filtering
 * it. Scored rather than hard-filtered on purpose: a hard filter on budget and
 * type empties the section on a young marketplace, and an empty section is worse
 * than a loosely related one. Weights reflect what a renter actually substitutes
 * between — the same kind of place first, then a comparable price, then the same
 * district.
 */
export function rankSimilarListings(current: Listing, candidates: Listing[], limit = 3): Listing[] {
  const rent = current.monthlyRent || 0;

  return candidates
    .filter((item) => item.id !== current.id)
    .map((item) => {
      let score = 0;
      if (item.listingType === current.listingType) score += 3;
      if (item.propertyType === current.propertyType) score += 2;
      if (current.district && item.district === current.district) score += 1;

      // Within 25% of the asking rent counts as the same budget bracket; the
      // partial credit below keeps near-misses ahead of wildly different prices.
      if (rent > 0 && item.monthlyRent > 0) {
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
