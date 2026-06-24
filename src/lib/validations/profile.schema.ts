import { z } from "zod";

export const basicInfoSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  age: z.number().int().min(16, "Minimum age is 16").max(80, "Enter a valid age"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  university: z.string().min(1, "Select your university"),
  occupation: z.string().min(2, "Enter your occupation")
});

export const housingSchema = z
  .object({
    minBudget: z.number().int().min(0, "Budget must be positive"),
    maxBudget: z.number().int().min(1, "Enter your max budget"),
    preferredMoveInDate: z.string().min(1, "Select a move-in date")
  })
  .refine((data) => data.maxBudget >= data.minBudget, {
    path: ["maxBudget"],
    message: "Max budget must be greater than min budget"
  });

export const lifestyleSchema = z.object({
  smoking: z.enum(["no", "yes", "outside", "no_preference"]),
  pets: z.enum(["no_pets", "pet_friendly", "has_pets", "no_preference"]),
  cleanliness: z.enum(["relaxed", "moderate", "very_clean"]),
  sleepSchedule: z.enum(["early_bird", "balanced", "night_owl"]),
  guests: z.enum(["rarely", "sometimes", "often"])
});

export const onboardingProfileSchema = basicInfoSchema.merge(housingSchema).merge(
  z.object({
    lifestyle: lifestyleSchema
  })
);

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type HousingInput = z.infer<typeof housingSchema>;
export type LifestyleInput = z.infer<typeof lifestyleSchema>;
