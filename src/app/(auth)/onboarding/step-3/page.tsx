"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { upsertProfile } from "@/lib/data/profiles";
import { profileCompletion } from "@/lib/utils/compatibility";
import {
  lifestyleSchema,
  type BasicInfoInput,
  type HousingInput,
  type LifestyleInput
} from "@/lib/validations/profile.schema";
import type { LifestylePreferences, UserProfile } from "@/types/user";

const groups: Array<{
  name: keyof LifestyleInput;
  label: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    name: "smoking",
    label: "Smoking",
    options: [
      { value: "no", label: "No" },
      { value: "outside", label: "Outside" },
      { value: "yes", label: "Yes" },
      { value: "no_preference", label: "No preference" }
    ]
  },
  {
    name: "pets",
    label: "Pets",
    options: [
      { value: "no_pets", label: "No pets" },
      { value: "pet_friendly", label: "Pet friendly" },
      { value: "has_pets", label: "Has pets" },
      { value: "no_preference", label: "No preference" }
    ]
  },
  {
    name: "cleanliness",
    label: "Cleanliness",
    options: [
      { value: "relaxed", label: "Relaxed" },
      { value: "moderate", label: "Moderate" },
      { value: "very_clean", label: "Very clean" }
    ]
  },
  {
    name: "sleepSchedule",
    label: "Sleep schedule",
    options: [
      { value: "early_bird", label: "Early bird" },
      { value: "balanced", label: "Balanced" },
      { value: "night_owl", label: "Night owl" }
    ]
  },
  {
    name: "guests",
    label: "Guests",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" }
    ]
  }
];

function readDraft<T>(key: string): T | null {
  const saved = window.localStorage.getItem(key);
  return saved ? (JSON.parse(saved) as T) : null;
}

export default function OnboardingStepThreePage() {
  const router = useRouter();
  const { user, profile: existingProfile } = useAuth();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<LifestyleInput>({
    resolver: zodResolver(lifestyleSchema),
    defaultValues: {
      smoking: "no",
      pets: "no_pets",
      cleanliness: "moderate",
      sleepSchedule: "balanced",
      guests: "sometimes"
    }
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("roommate-kz:onboarding:step-3");
    if (saved) {
      reset(JSON.parse(saved) as LifestyleInput);
      return;
    }
    if (existingProfile?.lifestyle) reset(existingProfile.lifestyle);
  }, [existingProfile?.lifestyle, reset]);

  async function onSubmit(values: LifestyleInput) {
    if (!user) {
      toast.error("Please sign in before completing onboarding");
      router.replace("/sign-in?redirect=/onboarding/step-3");
      return;
    }

    const basics =
      readDraft<BasicInfoInput>("roommate-kz:onboarding:step-1") ??
      (existingProfile
        ? {
            fullName: existingProfile.fullName,
            age: existingProfile.age,
            gender: existingProfile.gender,
            university: existingProfile.university,
            occupation: existingProfile.occupation
          }
        : null);
    const housing =
      readDraft<HousingInput>("roommate-kz:onboarding:step-2") ??
      (existingProfile
        ? {
            minBudget: existingProfile.minBudget,
            maxBudget: existingProfile.maxBudget,
            preferredMoveInDate:
              existingProfile.preferredMoveInDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10)
          }
        : null);

    if (!basics || !housing) {
      toast.error("Please complete the previous onboarding steps");
      router.push(!basics ? "/onboarding/step-1" : "/onboarding/step-2");
      return;
    }

    try {
      window.localStorage.setItem("roommate-kz:onboarding:step-3", JSON.stringify(values));
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        fullName: basics.fullName,
        age: basics.age,
        gender: basics.gender,
        university: basics.university,
        occupation: basics.occupation,
        minBudget: housing.minBudget,
        maxBudget: housing.maxBudget,
        preferredMoveInDate: new Date(housing.preferredMoveInDate),
        lifestyle: values as LifestylePreferences,
        onboardingComplete: true,
        photoURL: existingProfile?.photoURL ?? user.photoURL,
        bio: existingProfile?.bio ?? "",
        role: "user",
        verified: user.emailVerified,
        favoriteListingIds: existingProfile?.favoriteListingIds ?? [],
        profileCompletion: 0,
        createdAt: existingProfile?.createdAt ?? new Date(),
        updatedAt: new Date()
      };
      profile.profileCompletion = profileCompletion({
        ...profile,
        updatedAt: new Date()
      });

      await upsertProfile(profile);
      window.localStorage.removeItem("roommate-kz:onboarding:step-1");
      window.localStorage.removeItem("roommate-kz:onboarding:step-2");
      window.localStorage.removeItem("roommate-kz:onboarding:step-3");
      toast.success("Profile completed");
      router.replace("/rooms");
    } catch (error) {
      console.error(error);
      toast.error("Could not save your profile");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Match your lifestyle</h1>
        <p className="mt-2 text-sm text-foreground/60">These choices power roommate compatibility scores.</p>
      </div>

      {groups.map((group) => (
        <Controller
          key={group.name}
          name={group.name}
          control={control}
          render={({ field }) => (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">{group.label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const selected = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-white text-foreground hover:border-primary"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/onboarding/step-2")}
          className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Finish Onboarding
        </button>
      </div>
    </form>
  );
}
