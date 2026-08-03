"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { UniversityCombobox } from "@/components/shared/university-combobox";
import { CITIES } from "@/lib/constants/cities";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { basicInfoSchema, type BasicInfoInput } from "@/lib/validations/profile.schema";

export default function OnboardingStepOnePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<BasicInfoInput>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      fullName: "",
      age: 18,
      gender: "prefer_not_to_say",
      university: "",
      city: "",
      occupation: "Student"
    }
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("roomi:onboarding:step-1");
    if (saved) {
      reset(JSON.parse(saved) as BasicInfoInput);
      return;
    }
    if (profile) {
      reset({
        fullName: profile.fullName,
        age: profile.age,
        gender: profile.gender,
        university: profile.university,
        city: profile.city ?? "",
        occupation: profile.occupation
      });
    }
  }, [profile, reset]);

  function onSubmit(values: BasicInfoInput) {
    window.localStorage.setItem("roomi:onboarding:step-1", JSON.stringify(values));
    router.push("/onboarding/step-2");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("onboarding.step1Title")}</h1>
        <p className="mt-2 text-sm text-foreground/60">{t("onboarding.step1Subtitle")}</p>
      </div>

      <div>
        <label htmlFor="fullName">{t("onboarding.fullNameLabel")}</label>
        <input id="fullName" autoComplete="name" {...register("fullName")} />
        {errors.fullName ? <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="age">{t("onboarding.ageLabel")}</label>
          <input id="age" type="number" min={16} {...register("age", { valueAsNumber: true })} />
          {errors.age ? <p className="mt-1 text-xs text-red-600">{errors.age.message}</p> : null}
        </div>
        <div>
          <label htmlFor="gender">{t("onboarding.genderLabel")}</label>
          <select id="gender" {...register("gender")}>
            <option value="female">{t("onboarding.genderFemale")}</option>
            <option value="male">{t("onboarding.genderMale")}</option>
            <option value="other">{t("onboarding.genderOther")}</option>
            <option value="prefer_not_to_say">{t("onboarding.genderPreferNotToSay")}</option>
          </select>
          {errors.gender ? <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="university">{t("onboarding.universityLabel")}</label>
        <UniversityCombobox
          id="university"
          value={watch("university") ?? ""}
          onChange={(value) => setValue("university", value, { shouldValidate: true })}
          placeholder={t("roommates.universitySearchPlaceholder")}
        />
        {errors.university ? <p className="mt-1 text-xs text-red-600">{errors.university.message}</p> : null}
      </div>

      <div>
        <label htmlFor="city">{t("onboarding.cityLabel")}</label>
        <select id="city" {...register("city")}>
          <option value="">{t("onboarding.cityPlaceholder")}</option>
          {CITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.city ? <p className="mt-1 text-xs text-red-600">{errors.city.message}</p> : null}
      </div>

      <div>
        <label htmlFor="occupation">{t("onboarding.occupationLabel")}</label>
        <input id="occupation" {...register("occupation")} />
        {errors.occupation ? <p className="mt-1 text-xs text-red-600">{errors.occupation.message}</p> : null}
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        {t("onboarding.continueButton")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
