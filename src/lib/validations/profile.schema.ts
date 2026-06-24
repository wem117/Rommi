import { z } from "zod";

// 1. Базовая информация (чистый объект)
export const basicInfoSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  age: z.number().int().min(16, "Minimum age is 16").max(80, "Enter a valid age"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  university: z.string().min(1, "Select your university"),
  occupation: z.string().min(2, "Enter your occupation")
});

// 2. Выносим чистые поля жилья отдельно, БЕЗ .refine()
export const housingFields = z.object({
  minBudget: z.number().int().min(0, "Budget must be positive"),
  maxBudget: z.number().int().min(1, "Enter your max budget"),
  preferredMoveInDate: z.string().min(1, "Select a move-in date")
});

// 3. Создаем отдельную housingSchema с проверкой (для обратной совместимости, если она импортируется отдельно)
export const housingSchema = housingFields.refine((data) => data.maxBudget >= data.minBudget, {
  path: ["maxBudget"],
  message: "Max budget must be greater than min budget"
});

// 4. Лайфстайл (чистый объект)
export const lifestyleSchema = z.object({
  smoking: z.enum(["no", "yes", "outside", "no_preference"]),
  pets: z.enum(["no_pets", "pet_friendly", "has_pets", "no_preference"]),
  cleanliness: z.enum(["relaxed", "moderate", "very_clean"]),
  sleepSchedule: z.enum(["early_bird", "balanced", "night_owl"]),
  guests: z.enum(["rarely", "sometimes", "often"])
});

// 5. Собираем финальную схему онбординга: 
// Мержим ЧИСТЫЕ поля (housingFields), а .refine() накладываем в самом конце на всю структуру
export const onboardingProfileSchema = basicInfoSchema
  .merge(housingFields) 
  .merge(
    z.object({
      lifestyle: lifestyleSchema
    })
  )
  .refine((data) => data.maxBudget >= data.minBudget, {
    path: ["maxBudget"],
    message: "Max budget must be greater than min budget"
  });

// Типы остаются абсолютно такими же, ничего переписывать в компонентах не придется
export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type HousingInput = z.infer<typeof housingSchema>;
export type LifestyleInput = z.infer<typeof lifestyleSchema>;