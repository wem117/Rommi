import {
  AirVent,
  Car,
  CircleCheck,
  Droplets,
  Dumbbell,
  ShieldCheck,
  Sofa,
  Sun,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
  type LucideIcon
} from "lucide-react";

/**
 * Amenity presentation: grouping and per-amenity icons.
 *
 * The listing page previously rendered every amenity as an undifferentiated
 * flat list in which all ten shared ONE icon (a shield), so the icons carried
 * no information at all — they were decoration that cost horizontal space and
 * made the list slower to scan than plain text would have been.
 *
 * Grouping matches how renters actually ask about a place: what's inside the
 * flat, how comfortable it is, and what the building offers.
 */

/** Display groups, in render order. Values must match the stored amenity strings. */
export const AMENITY_GROUPS: Record<string, string[]> = {
  essentials: ["WiFi", "Hot Water", "Kitchen", "Washing Machine"],
  comfort: ["AC", "Furnished", "Balcony"],
  building: ["Parking", "Gym", "Security"]
};

/** Every amenity the app has a translation for. */
export const KNOWN_AMENITIES = new Set(Object.values(AMENITY_GROUPS).flat());

const ICONS: Record<string, LucideIcon> = {
  WiFi: Wifi,
  "Hot Water": Droplets,
  Kitchen: UtensilsCrossed,
  "Washing Machine": WashingMachine,
  AC: AirVent,
  Furnished: Sofa,
  Balcony: Sun,
  Parking: Car,
  Gym: Dumbbell,
  Security: ShieldCheck
};

/**
 * Icon for an amenity.
 *
 * Free-text amenities from imported posts fall back to a neutral check rather
 * than being hidden — an unrecognised amenity is still a real feature of the
 * property, and dropping it would lose detail the source post supplied.
 */
export function amenityIcon(amenity: string): LucideIcon {
  return ICONS[amenity] ?? CircleCheck;
}

/** True when the app has a translation for this amenity. */
export function isKnownAmenity(amenity: string): boolean {
  return KNOWN_AMENITIES.has(amenity);
}
