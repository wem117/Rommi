import { z } from "zod";
import { MAX_MONTHLY_RENT } from "@/lib/validations/monthly-rent";

/*
 * Lightweight gibberish heuristics — practical guards against keyboard mash
 * and low-effort spam, deliberately loose enough not to reject real titles in
 * any of the app's languages (en/ru/kz):
 *  - a single character repeated 5+ times in a row ("aaaaaa", "!!!!!")
 *  - a "word" longer than 24 characters (no real word in these languages is)
 *  - long text drawn from a tiny alphabet ("ababababababab")
 */
const REPEATED_CHAR_RUN = /(.)\1{4,}/;

function looksLikeGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (REPEATED_CHAR_RUN.test(trimmed)) return true;

  const words = trimmed.split(/\s+/);
  if (words.some((word) => word.length > 24)) return true;

  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  if (trimmed.length >= 15 && uniqueChars <= 6) return true;

  return false;
}

/** Titles longer than 16 chars must contain at least two words. */
function isMeaningfulTitle(title: string): boolean {
  const trimmed = title.trim();
  if (looksLikeGibberish(trimmed)) return false;
  const wordCount = trimmed.split(/\s+/).length;
  return wordCount >= 2 || trimmed.length <= 16;
}

/** Descriptions must read like a sentence: no gibberish, at least 5 words. */
function isMeaningfulDescription(description: string): boolean {
  const trimmed = description.trim();
  if (looksLikeGibberish(trimmed)) return false;
  return trimmed.split(/\s+/).length >= 5;
}

export const listingSchema = z
  .object({
    title: z
      .string()
      .min(8, "Title must be at least 8 characters")
      .max(100)
      .refine(isMeaningfulTitle, "Enter a meaningful title (real words, no repeated characters)"),
    description: z
      .string()
      .min(30, "Description must be at least 30 characters")
      .max(2000)
      .refine(isMeaningfulDescription, "Enter a meaningful description (a few real sentences)"),
    propertyType: z.enum(["apartment", "house", "dorm", "studio"]),
    listingType: z.enum(["private_room", "shared_room", "entire_place"]),
    monthlyRent: z
      .number()
      .int()
      .min(0, "Rent must be at least 0")
      .max(MAX_MONTHLY_RENT, `Rent must be at most ${MAX_MONTHLY_RENT.toLocaleString()} KZT`),
    depositRequired: z.boolean().default(false),
    depositAmount: z.number().int().min(0).default(0),
    city: z.string().min(1, "City is required"),
    district: z.string().optional(),
    address: z.string().min(5, "Address is required"),
    university: z.string().min(1, "Select the nearest university"),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20),
    availableFrom: z.string().min(1, "Available date is required"),
    amenities: z.array(z.string()).max(20),
    genderPreference: z.enum(["any", "male", "female"]),
    smoking: z.enum(["no", "yes"]),
    pets: z.enum(["no_pets", "allowed"]),
    // Photos are OPTIONAL — a listing without photos publishes normally and the
    // UI renders a designed "no photo" placeholder (never a broken image).
    photoUrls: z.array(z.string().url("Photo must be a valid URL")).max(10)
  })
  .refine((data) => !data.depositRequired || data.depositAmount > 0, {
    path: ["depositAmount"],
    message: "Enter a deposit amount"
  })
  .refine((data) => new Date(data.availableFrom).toString() !== "Invalid Date", {
    path: ["availableFrom"],
    message: "Enter a valid available date"
  });

export type ListingInput = z.infer<typeof listingSchema>;
