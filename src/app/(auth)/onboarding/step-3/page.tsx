"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { lifestyleSchema, type LifestyleInput } from "@/lib/validations/profile.schema";

export default function OnboardingStepThreePage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch
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

  // Track current values to style the active tab buttons.
  const currentValues = watch();

  async function onSubmit(step3Values: LifestyleInput) {
    if (!user) {
      setSubmitError(t("onboarding.sessionNotFoundError"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const step1Raw = window.localStorage.getItem("roomi:onboarding:step-1");
      const step2Raw = window.localStorage.getItem("roomi:onboarding:step-2");

      if (!step1Raw || !step2Raw) {
        throw new Error(t("onboarding.missingPreviousDataError"));
      }

      const step1 = JSON.parse(step1Raw);
      const step2 = JSON.parse(step2Raw);

      const supabase = getSupabaseBrowserClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Onboarding session lookup failed", {
          message: sessionError.message,
          status: sessionError.status
        });
        throw new Error(t("onboarding.sessionVerifyError"));
      }

      if (!sessionData.session?.user) {
        console.error("Onboarding blocked because Supabase returned no active browser session", {
          authContextUserId: user.uid
        });
        throw new Error(t("onboarding.sessionExpiredError"));
      }

      const finalUid = sessionData.session.user.id || user.uid;

      if (!finalUid) {
        throw new Error(t("onboarding.sessionExpiredError"));
      }

      if (user.uid !== sessionData.session.user.id) {
        console.error("Onboarding user mismatch", {
          authContextUserId: user.uid,
          supabaseSessionUserId: sessionData.session.user.id
        });
      }

      const profilePayload = {
        uid: finalUid,
        email: user.email,
        full_name: step1.fullName,
        age: Number(step1.age),
        gender: step1.gender,
        university: step1.university,
        city: step1.city,
        occupation: step1.occupation,
        min_budget: Number(step2.minBudget),
        max_budget: Number(step2.maxBudget),
        preferred_move_in_date: step2.preferredMoveInDate ? new Date(step2.preferredMoveInDate).toISOString() : null,
        lifestyle: step3Values,
        onboarding_complete: true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "uid" });

      if (error) {
        console.error("Onboarding profile upsert failed", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          uid: finalUid
        });
        throw error;
      }

      window.localStorage.removeItem("roomi:onboarding:step-1");
      window.localStorage.removeItem("roomi:onboarding:step-2");

      // Re-read the row BEFORE navigating. Without this the cached profile still
      // says onboarding is unfinished for the rest of the session, so the next
      // click on Profile bounced the user straight back into onboarding — the
      // exact loop reported. Awaited, so the guard on the next page sees truth.
      await refreshProfile();

      router.replace("/rooms");
    } catch (err: unknown) {
      console.error("Onboarding submission failed:", err);
      setSubmitError(err instanceof Error ? err.message : t("onboarding.genericSaveError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderPillOptions = (
    fieldName: keyof LifestyleInput,
    options: { value: string; label: string }[]
  ) => {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = currentValues[fieldName] === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue(fieldName, opt.value as LifestyleInput[keyof LifestyleInput])}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary border-primary text-white"
                  : "bg-background border-border text-foreground hover:bg-neutral-100"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("onboarding.step3Title")}</h1>
        <p className="mt-2 text-sm text-foreground/60">{t("onboarding.step3Subtitle")}</p>
      </div>

      {submitError && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          ⚠️ {submitError}
        </div>
      )}

      <div>
        <label className="text-sm font-medium">{t("onboarding.smokingLabel")}</label>
        {renderPillOptions("smoking", [
          { value: "no", label: t("onboarding.smokingNo") },
          { value: "outside", label: t("onboarding.smokingOutside") },
          { value: "yes", label: t("onboarding.smokingYes") },
          { value: "no_preference", label: t("onboarding.noPreference") }
        ])}
      </div>

      <div>
        <label className="text-sm font-medium">{t("onboarding.petsLabel")}</label>
        {renderPillOptions("pets", [
          { value: "no_pets", label: t("onboarding.petsNo") },
          { value: "pet_friendly", label: t("onboarding.petsFriendly") },
          { value: "has_pets", label: t("onboarding.petsHas") },
          { value: "no_preference", label: t("onboarding.noPreference") }
        ])}
      </div>

      <div>
        <label className="text-sm font-medium">{t("onboarding.cleanlinessLabel")}</label>
        {renderPillOptions("cleanliness", [
          { value: "relaxed", label: t("onboarding.cleanlinessRelaxed") },
          { value: "moderate", label: t("onboarding.cleanlinessModerate") },
          { value: "very_clean", label: t("onboarding.cleanlinessVeryClean") }
        ])}
      </div>

      <div>
        <label className="text-sm font-medium">{t("onboarding.sleepScheduleLabel")}</label>
        {renderPillOptions("sleepSchedule", [
          { value: "early_bird", label: t("onboarding.sleepEarlyBird") },
          { value: "balanced", label: t("onboarding.sleepBalanced") },
          { value: "night_owl", label: t("onboarding.sleepNightOwl") }
        ])}
      </div>

      <div>
        <label className="text-sm font-medium">{t("onboarding.guestsLabel")}</label>
        {renderPillOptions("guests", [
          { value: "rarely", label: t("onboarding.guestsRarely") },
          { value: "sometimes", label: t("onboarding.guestsSometimes") },
          { value: "often", label: t("onboarding.guestsOften") }
        ])}
      </div>

      <div className="grid grid-cols-3 gap-3 pt-4">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => router.push("/onboarding/step-2")}
          className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("onboarding.backButton")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("onboarding.savingProfile")}
            </>
          ) : (
            t("onboarding.finishButton")
          )}
        </button>
      </div>
    </form>
  );
}
