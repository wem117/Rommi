"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { housingSchema, type HousingInput } from "@/lib/validations/profile.schema";

export default function OnboardingStepTwoPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLocale();
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
    const saved = window.localStorage.getItem("roomi:onboarding:step-2");
    if (saved) {
      reset(JSON.parse(saved) as HousingInput);
      return;
    }
    if (profile) {
      reset({
        minBudget: profile.minBudget,
        maxBudget: profile.maxBudget,
        preferredMoveInDate: profile.preferredMoveInDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10)
      });
    }
  }, [profile, reset]);

  function onSubmit(values: HousingInput) {
    window.localStorage.setItem("roomi:onboarding:step-2", JSON.stringify(values));
    router.push("/onboarding/step-3");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("onboarding.step2Title")}</h1>
        <p className="mt-2 text-sm text-foreground/60">{t("onboarding.step2Subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="minBudget">{t("onboarding.minBudgetLabel")}</label>
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
          <label htmlFor="maxBudget">{t("onboarding.maxBudgetLabel")}</label>
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
        <label htmlFor="preferredMoveInDate">{t("onboarding.moveInDateLabel")}</label>
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
          {t("onboarding.backButton")}
        </button>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          {t("onboarding.continueButton")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
