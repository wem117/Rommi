"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { housingSchema, type HousingInput } from "@/lib/validations/profile.schema";

export default function OnboardingStepTwoPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<HousingInput>({
    resolver: zodResolver(housingSchema),
    defaultValues: {
      minBudget: 80000,
      maxBudget: 180000,
      preferredMoveInDate: new Date().toISOString().slice(0, 10)
    }
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("roommate-kz:onboarding:step-2");
    if (saved) reset(JSON.parse(saved) as HousingInput);
  }, [reset]);

  function onSubmit(values: HousingInput) {
    window.localStorage.setItem("roommate-kz:onboarding:step-2", JSON.stringify(values));
    router.push("/onboarding/step-3");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Set your housing range</h1>
        <p className="mt-2 text-sm text-foreground/60">All budgets are saved in Kazakhstani Tenge.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="minBudget">Min budget (₸)</label>
          <input
            id="minBudget"
            type="number"
            min={0}
            step={1000}
            {...register("minBudget", { valueAsNumber: true })}
          />
          {errors.minBudget ? <p className="mt-1 text-xs text-red-600">{errors.minBudget.message}</p> : null}
        </div>
        <div>
          <label htmlFor="maxBudget">Max budget (₸)</label>
          <input
            id="maxBudget"
            type="number"
            min={0}
            step={1000}
            {...register("maxBudget", { valueAsNumber: true })}
          />
          {errors.maxBudget ? <p className="mt-1 text-xs text-red-600">{errors.maxBudget.message}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="preferredMoveInDate">Preferred move-in date</label>
        <input id="preferredMoveInDate" type="date" {...register("preferredMoveInDate")} />
        {errors.preferredMoveInDate ? (
          <p className="mt-1 text-xs text-red-600">{errors.preferredMoveInDate.message}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/onboarding/step-1")}
          className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
