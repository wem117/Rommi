"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { UNIVERSITIES } from "@/lib/constants/universities";
import { basicInfoSchema, type BasicInfoInput } from "@/lib/validations/profile.schema";
import { useAuth } from "@/context/auth-context";

export default function OnboardingStepOnePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<BasicInfoInput>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      fullName: "",
      age: 18,
      gender: "prefer_not_to_say",
      university: "",
      occupation: "Student"
    }
  });

  useEffect(() => {
    const saved = window.localStorage.getItem("roommate-kz:onboarding:step-1");
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
        occupation: profile.occupation
      });
    }
  }, [profile, reset]);

  function onSubmit(values: BasicInfoInput) {
    window.localStorage.setItem("roommate-kz:onboarding:step-1", JSON.stringify(values));
    router.push("/onboarding/step-2");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tell us about yourself</h1>
        <p className="mt-2 text-sm text-foreground/60">This helps students recognize who they are meeting.</p>
      </div>

      <div>
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" autoComplete="name" {...register("fullName")} />
        {errors.fullName ? <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="age">Age</label>
          <input id="age" type="number" min={16} {...register("age", { valueAsNumber: true })} />
          {errors.age ? <p className="mt-1 text-xs text-red-600">{errors.age.message}</p> : null}
        </div>
        <div>
          <label htmlFor="gender">Gender</label>
          <select id="gender" {...register("gender")}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          {errors.gender ? <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p> : null}
        </div>
      </div>

      <div>
        <label htmlFor="university">University</label>
        <select id="university" {...register("university")}>
          <option value="">Select university</option>
          {UNIVERSITIES.map((university) => (
            <option key={university} value={university}>
              {university}
            </option>
          ))}
        </select>
        {errors.university ? <p className="mt-1 text-xs text-red-600">{errors.university.message}</p> : null}
      </div>

      <div>
        <label htmlFor="occupation">Occupation</label>
        <input id="occupation" {...register("occupation")} />
        {errors.occupation ? <p className="mt-1 text-xs text-red-600">{errors.occupation.message}</p> : null}
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
