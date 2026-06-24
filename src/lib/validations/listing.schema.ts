import { z } from "zod";

export const listingSchema = z
  .object({
    title: z.string().min(8, "Title must be at least 8 characters").max(100),
    description: z.string().min(30, "Description must be at least 30 characters").max(2000),
    propertyType: z.enum(["apartment", "house", "dorm", "studio"]),
    listingType: z.enum(["private_room", "shared_room", "entire_place"]),
    monthlyRent: z.number().int().min(1, "Rent is required"),
    city: z.string().min(1, "City is required"),
    district: z.string().optional(),
    address: z.string().min(5, "Address is required"),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20),
    availableFrom: z.string().min(1, "Available date is required"),
    amenities: z.array(z.string()).max(20),
    genderPreference: z.enum(["any", "male", "female"]),
    smoking: z.enum(["no", "yes"]),
    pets: z.enum(["no_pets", "allowed"]),
    photoUrls: z.array(z.string().url("Photo must be a valid URL")).max(10)
  })
  .refine((data) => new Date(data.availableFrom).toString() !== "Invalid Date", {
    path: ["availableFrom"],
    message: "Enter a valid available date"
  });

export type ListingInput = z.infer<typeof listingSchema>;
