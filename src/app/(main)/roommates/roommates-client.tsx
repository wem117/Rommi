"use client";

import { RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { RoommateCard } from "@/components/roommates/roommate-card";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { matchesAgeRange } from "@/lib/utils/profile-display";
import { matchesCity } from "@/lib/utils/roommate-city";
import { CITIES } from "@/lib/constants/cities";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { useRoommates } from "@/hooks/use-roommates";
import type { Gender, UserProfile } from "@/types/user";

type BudgetFilter = "any" | "25000" | "40000" | "50000" | "75000" | "100000" | "150000" | "200000" | "300000";

const BUDGET_PRESETS = [25000, 40000, 50000, 75000, 100000, 150000, 200000, 300000] as const;

const ALL_CITIES = "All Cities";
const cityOptions = [ALL_CITIES, ...CITIES];

function RoommatesPageContent({ initial }: { initial: UserProfile[] }) {
  const searchParams = useSearchParams();
  const universityParam = searchParams.get("university");
  const { profile } = useAuth();
  const { t } = useLocale();
  const { roommates, loading, error } = useRoommates(initial);
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
    ...BUDGET_PRESETS.map((amount) => ({
      label: `${amount.toLocaleString("en-US")} ₸`,
      value: String(amount) as BudgetFilter
    }))
  ];

  const filteredRoommates = useMemo(() => {
    const parsedMinAge = Number(minAge) || 18;
    const parsedMaxAge = Number(maxAge) || 30;
    const parsedBudget = maxBudget === "any" ? null : Number(maxBudget);

    const universityQuery = university.trim().toLowerCase();

    return roommates
      .filter((roommate) => {
        // Prefers the stored profiles.city, falling back to the
        // university-derived city for rows created before that column existed.
        const cityMatches = matchesCity(roommate, city, ALL_CITIES);
        const matchesUniversity =
          !universityQuery || (roommate.university ?? "").toLowerCase().includes(universityQuery);
        const matchesGender = gender === "all" || roommate.gender === gender;
        // Age 0 is the documented "not stated" sentinel (admin-quick.schema.ts):
        // posts imported from Telegram/WhatsApp/OLX rarely mention an age, and
        // the admin must not invent one for a stranger.
        //
        // Comparing that sentinel against the range excluded every such profile
        // — `0 >= 18` is false — and because the age inputs carry min="18" a
        // visitor could not widen the range to reach them either. Imported
        // roommates were saved correctly and then permanently unreachable in the
        // directory, which is exactly the bug this guard removes.
        //
        // An unknown age cannot be judged against a range, so it is not filtered
        // on. The alternative silently drops most imported inventory, which is
        // far worse for a discovery page than showing a profile whose age is
        // openly displayed as unstated.
        const matchesAge = matchesAgeRange(roommate.age, parsedMinAge, parsedMaxAge);
        const matchesBudget = parsedBudget === null || roommate.maxBudget <= parsedBudget;

        return cityMatches && matchesUniversity && matchesGender && matchesAge && matchesBudget;
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
        <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#16110f] sm:text-5xl">
            {t("roommates.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-base text-[#9a6e56] sm:mt-4 sm:text-lg">
            {t("roommates.description")}
          </p>

          <div className="mt-5 grid grid-cols-2 items-end gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label={t("roommates.city")} className="col-span-2 md:col-span-1">
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                {cityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === ALL_CITIES ? t("roommates.allCities") : option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("roommates.university")} className="col-span-2 md:col-span-1">
              <UniversityCombobox
                value={university}
                onChange={setUniversity}
                placeholder={t("roommates.universitySearchPlaceholder")}
              />
            </Field>

            <Field label={t("roommates.gender")} className="col-span-2 md:col-span-1">
              <select value={gender} onChange={(event) => setGender(event.target.value as Gender | "all")}>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("roommates.minAge")} className="col-span-1">
              <input
                type="number"
                min="18"
                value={minAge}
                onChange={(event) => setMinAge(event.target.value)}
              />
            </Field>

            <Field label={t("roommates.maxAge")} className="col-span-1">
              <input
                type="number"
                min="18"
                value={maxAge}
                onChange={(event) => setMaxAge(event.target.value)}
              />
            </Field>

            <Field label={t("roommates.maxBudget")} className="col-span-2 md:col-span-1">
              <select value={maxBudget} onChange={(event) => setMaxBudget(event.target.value as BudgetFilter)}>
                {budgetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <p className="mt-4 text-sm font-medium text-[#9a6e56] sm:mt-6">
            <span className="font-semibold text-[#1b1715]">{filteredRoommates.length}</span> {t("roommates.found")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-12 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[340px] animate-pulse rounded-3xl border border-[#ece1d3] bg-white shadow-soft sm:h-[430px] sm:rounded-[2rem]"
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
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95"
            >
              <RefreshCcw className="h-4 w-4" />
              {t("roommates.retry")}
            </button>
          </div>
        ) : null}

        {!loading && !error && filteredRoommates.length === 0 ? (
          <div className="rounded-3xl border border-[#ece1d3] bg-white p-6 text-center shadow-soft sm:rounded-[2rem] sm:p-10">
            <h2 className="text-xl font-bold text-[#16110f] sm:text-2xl">{t("roommates.emptyTitle")}</h2>
            <p className="mt-3 text-sm text-foreground/60">
              {t("roommates.emptyText")}
            </p>
          </div>
        ) : null}

        {!loading && !error && filteredRoommates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {filteredRoommates.map((roommate) => (
              <RoommateCard key={roommate.uid} profile={roommate} currentUser={profile} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function RoommatesClient({ initial }: { initial: UserProfile[] }) {
  return (
    <Suspense fallback={null}>
      <RoommatesPageContent initial={initial} />
    </Suspense>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#a87458] sm:mb-3 sm:text-sm">
        {label}
      </span>
      {children}
    </label>
  );
}
