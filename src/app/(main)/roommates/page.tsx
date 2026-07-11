"use client";

import { RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { RoommateCard } from "@/components/roommates/roommate-card";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { CITIES } from "@/lib/constants/cities";
import { getUniversityCity } from "@/lib/constants/universities";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { useRoommates } from "@/hooks/use-roommates";
import type { Gender } from "@/types/user";

type BudgetFilter = "any" | "100000" | "150000" | "200000" | "250000";

const ALL_CITIES = "All Cities";
const cityOptions = [ALL_CITIES, ...CITIES];

function RoommatesPageContent() {
  const searchParams = useSearchParams();
  const universityParam = searchParams.get("university");
  const { profile } = useAuth();
  const { t } = useLocale();
  const { roommates, loading, error } = useRoommates();
  const [city, setCity] = useState(ALL_CITIES);
  const [university, setUniversity] = useState(universityParam ?? "");
  const [gender, setGender] = useState<Gender | "all">("all");
  const [minAge, setMinAge] = useState("18");
  const [maxAge, setMaxAge] = useState("30");
  const [maxBudget, setMaxBudget] = useState<BudgetFilter>("any");
  const genderOptions: Array<{ label: string; value: Gender | "all" }> = [
    { label: t("roommates.all"), value: "all" },
    { label: t("listingForm.male"), value: "male" },
    { label: t("listingForm.female"), value: "female" },
    { label: t("roommates.other"), value: "other" },
    { label: t("roommates.preferNotToSay"), value: "prefer_not_to_say" }
  ];
  const budgetOptions: Array<{ label: string; value: BudgetFilter }> = [
    { label: t("roommates.any"), value: "any" },
    { label: "100,000 KZT", value: "100000" },
    { label: "150,000 KZT", value: "150000" },
    { label: "200,000 KZT", value: "200000" },
    { label: "250,000 KZT", value: "250000" }
  ];

  const filteredRoommates = useMemo(() => {
    const parsedMinAge = Number(minAge) || 18;
    const parsedMaxAge = Number(maxAge) || 30;
    const parsedBudget = maxBudget === "any" ? null : Number(maxBudget);

    const universityQuery = university.trim().toLowerCase();

    return roommates
      .filter((roommate) => {
        const roommateCity = getUniversityCity(roommate.university);
        const matchesCity = city === ALL_CITIES || roommateCity === city;
        const matchesUniversity =
          !universityQuery || (roommate.university ?? "").toLowerCase().includes(universityQuery);
        const matchesGender = gender === "all" || roommate.gender === gender;
        const matchesMinAge = roommate.age >= parsedMinAge;
        const matchesMaxAge = roommate.age <= parsedMaxAge;
        const matchesBudget = parsedBudget === null || roommate.maxBudget <= parsedBudget;

        return (
          matchesCity && matchesUniversity && matchesGender && matchesMinAge && matchesMaxAge && matchesBudget
        );
      })
      .sort((first, second) => {
        if (!profile) return second.createdAt.getTime() - first.createdAt.getTime();

        return (
          calculateCompatibilityScore(profile, second) - calculateCompatibilityScore(profile, first)
        );
      });
  }, [city, university, gender, maxAge, maxBudget, minAge, profile, roommates]);

  return (
    <main className="min-h-[70vh] bg-[#fbf8f3]">
      <section className="border-y border-[#eadfce] bg-[#f5efe5]">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#16110f] sm:text-5xl">
            {t("roommates.title")}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-[#9a6e56]">
            {t("roommates.description")}
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label={t("roommates.city")}>
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                {cityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === ALL_CITIES ? t("roommates.allCities") : option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("roommates.university")}>
              <UniversityCombobox
                value={university}
                onChange={setUniversity}
                placeholder={t("roommates.universitySearchPlaceholder")}
              />
            </Field>

            <Field label={t("roommates.gender")}>
              <select value={gender} onChange={(event) => setGender(event.target.value as Gender | "all")}>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("roommates.minAge")}>
              <input
                type="number"
                min="18"
                value={minAge}
                onChange={(event) => setMinAge(event.target.value)}
              />
            </Field>

            <Field label={t("roommates.maxAge")}>
              <input
                type="number"
                min="18"
                value={maxAge}
                onChange={(event) => setMaxAge(event.target.value)}
              />
            </Field>

            <Field label={t("roommates.maxBudget")}>
              <select value={maxBudget} onChange={(event) => setMaxBudget(event.target.value as BudgetFilter)}>
                {budgetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <p className="mt-6 text-sm font-medium text-[#9a6e56]">
            <span className="font-semibold text-[#1b1715]">{filteredRoommates.length}</span> {t("roommates.found")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[430px] animate-pulse rounded-[2rem] border border-[#ece1d3] bg-white shadow-soft"
              />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-[2rem] border border-[#ece1d3] bg-white p-6 shadow-soft">
            <h2 className="text-xl font-bold text-[#16110f]">{t("roommates.unavailableTitle")}</h2>
            <p className="mt-2 text-sm text-foreground/65">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#12b000] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#109900]"
            >
              <RefreshCcw className="h-4 w-4" />
              {t("roommates.retry")}
            </button>
          </div>
        ) : null}

        {!loading && !error && filteredRoommates.length === 0 ? (
          <div className="rounded-[2rem] border border-[#ece1d3] bg-white p-10 text-center shadow-soft">
            <h2 className="text-2xl font-bold text-[#16110f]">{t("roommates.emptyTitle")}</h2>
            <p className="mt-3 text-sm text-foreground/60">
              {t("roommates.emptyText")}
            </p>
          </div>
        ) : null}

        {!loading && !error && filteredRoommates.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredRoommates.map((roommate) => (
              <RoommateCard key={roommate.uid} profile={roommate} currentUser={profile} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function RoommatesPage() {
  return (
    <Suspense fallback={null}>
      <RoommatesPageContent />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-3 block text-sm font-semibold uppercase tracking-[0.12em] text-[#a87458]">
        {label}
      </span>
      {children}
    </label>
  );
}
