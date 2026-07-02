"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { lifestyleSchema, type LifestyleInput } from "@/lib/validations/profile.schema";
import { useAuth } from "@/context/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function OnboardingStepThreePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
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

  // Следим за текущими значениями для стилизации активных кнопок-табов
  const currentValues = watch();

  async function onSubmit(step3Values: LifestyleInput) {
    if (!user) {
      setSubmitError("User session not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Извлекаем сохраненные данные из предыдущих шагов в localStorage
      const step1Raw = window.localStorage.getItem("roommate-kz:onboarding:step-1");
      const step2Raw = window.localStorage.getItem("roommate-kz:onboarding:step-2");

      if (!step1Raw || !step2Raw) {
        throw new Error("Missing previous onboarding data. Go back and re-fill steps 1 and 2.");
      }

      const step1 = JSON.parse(step1Raw);
      const step2 = JSON.parse(step2Raw);

      // 2. Инициализируем клиент Supabase и явно проверяем активную browser-сессию.
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Onboarding session lookup failed", {
          message: sessionError.message,
          status: sessionError.status
        });
        throw new Error("Could not verify your session. Please sign in again.");
      }

      if (!sessionData.session?.user) {
        console.error("Onboarding blocked because Supabase returned no active browser session", {
          authContextUserId: user.uid
        });
        throw new Error("Session expired. Please sign in again before finishing onboarding.");
      }

      // 3. Безопасное извлечение ID
      const finalUid = sessionData.session.user.id || user.uid;

      if (!finalUid) {
        throw new Error("Could not find user ID in your session. Please re-login.");
      }

      if (user.uid !== sessionData.session.user.id) {
        console.error("Onboarding user mismatch", {
          authContextUserId: user.uid,
          supabaseSessionUserId: sessionData.session.user.id
        });
      }

      // 4. Формируем payload с маппингом camelCase -> snake_case под структуру Postgres
      const profilePayload = {
        uid: finalUid,
        email: user.email,
        full_name: step1.fullName,
        age: Number(step1.age),
        gender: step1.gender,
        university: step1.university,
        occupation: step1.occupation,
        min_budget: Number(step2.minBudget),
        max_budget: Number(step2.maxBudget),
        preferred_move_in_date: step2.preferredMoveInDate ? new Date(step2.preferredMoveInDate).toISOString() : null,
        lifestyle: step3Values, // Весь объект привычек улетает в JSONB
        onboarding_complete: true,
        updated_at: new Date().toISOString()
      };

      // 5. Отправляем запрос в Supabase (создаем запись или обновляем, если она есть)
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

      // 6. Очищаем локальное хранилище после успешного сохранения в базу
      window.localStorage.removeItem("roommate-kz:onboarding:step-1");
      window.localStorage.removeItem("roommate-kz:onboarding:step-2");

      // 7. Перенаправляем в основную часть приложения
      router.replace("/rooms");
    } catch (err: unknown) {
      console.error("Onboarding submission failed:", err);
      setSubmitError(err instanceof Error ? err.message : "Could not save your profile. Check your database tables.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Вспомогательная функция для генерации красивых кнопок переключателей
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
              onClick={() => setValue(fieldName, opt.value as any)}
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
        <h1 className="text-2xl font-bold">Match your lifestyle</h1>
        <p className="mt-2 text-sm text-foreground/60">These choices power roommate compatibility scores.</p>
      </div>

      {submitError && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          ⚠️ {submitError}
        </div>
      )}

      {/* Smoking */}
      <div>
        <label className="text-sm font-medium">Smoking</label>
        {renderPillOptions("smoking", [
          { value: "no", label: "No" },
          { value: "outside", label: "Outside" },
          { value: "yes", label: "Yes" },
          { value: "no_preference", label: "No preference" }
        ])}
      </div>

      {/* Pets */}
      <div>
        <label className="text-sm font-medium">Pets</label>
        {renderPillOptions("pets", [
          { value: "no_pets", label: "No pets" },
          { value: "pet_friendly", label: "Pet friendly" },
          { value: "has_pets", label: "Has pets" },
          { value: "no_preference", label: "No preference" }
        ])}
      </div>

      {/* Cleanliness */}
      <div>
        <label className="text-sm font-medium">Cleanliness</label>
        {renderPillOptions("cleanliness", [
          { value: "relaxed", label: "Relaxed" },
          { value: "moderate", label: "Moderate" },
          { value: "very_clean", label: "Very clean" }
        ])}
      </div>

      {/* Sleep Schedule */}
      <div>
        <label className="text-sm font-medium">Sleep schedule</label>
        {renderPillOptions("sleepSchedule", [
          { value: "early_bird", label: "Early bird" },
          { value: "balanced", label: "Balanced" },
          { value: "night_owl", label: "Night owl" }
        ])}
      </div>

      {/* Guests */}
      <div>
        <label className="text-sm font-medium">Guests</label>
        {renderPillOptions("guests", [
          { value: "rarely", label: "Rarely" },
          { value: "sometimes", label: "Sometimes" },
          { value: "often", label: "Often" }
        ])}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => router.push("/onboarding/step-2")}
          className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            "Finish Onboarding"
          )}
        </button>
      </div>
    </form>
  );
}
