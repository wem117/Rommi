"use client";

import { RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { RoommateCard } from "@/components/roommates/roommate-card";
import { useAuth } from "@/context/auth-context";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { useRoommates } from "@/hooks/use-roommates";
import type { Gender, UserProfile } from "@/types/user";

type BudgetFilter = "any" | "100000" | "150000" | "200000" | "250000";

const cityOptions = ["All Cities", "Almaty", "Astana", "Shymkent", "Karaganda", "Aktobe", "Taraz"];
const genderOptions: Array<{ label: string; value: Gender | "all" }> = [
  { label: "All", value: "all" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer_not_to_say" }
];
const budgetOptions: Array<{ label: string; value: BudgetFilter }> = [
  { label: "Any", value: "any" },
  { label: "100,000 KZT", value: "100000" },
  { label: "150,000 KZT", value: "150000" },
  { label: "200,000 KZT", value: "200000" },
  { label: "250,000 KZT", value: "250000" }
];

export default function RoommatesPage() {
  const { profile } = useAuth();
  const { roommates, loading, error } = useRoommates();
  const [city, setCity] = useState("All Cities");
  const [gender, setGender] = useState<Gender | "all">("all");
  const [minAge, setMinAge] = useState("18");
  const [maxAge, setMaxAge] = useState("30");
  const [maxBudget, setMaxBudget] = useState<BudgetFilter>("any");

  const filteredRoommates = useMemo(() => {
    const parsedMinAge = Number(minAge) || 18;
    const parsedMaxAge = Number(maxAge) || 30;
    const parsedBudget = maxBudget === "any" ? null : Number(maxBudget);

    return roommates
      .filter((roommate) => {
        const roommateCity = getUniversityCity(roommate);
        const matchesCity = city === "All Cities" || roommateCity === city;
        const matchesGender = gender === "all" || roommate.gender === gender;
        const matchesMinAge = roommate.age >= parsedMinAge;
        const matchesMaxAge = roommate.age <= parsedMaxAge;
        const matchesBudget = parsedBudget === null || roommate.maxBudget <= parsedBudget;

        return matchesCity && matchesGender && matchesMinAge && matchesMaxAge && matchesBudget;
      })
      .sort((first, second) => {
        if (!profile) return second.createdAt.getTime() - first.createdAt.getTime();

        return (
          calculateCompatibilityScore(profile, second) - calculateCompatibilityScore(profile, first)
        );
      });
  }, [city, gender, maxAge, maxBudget, minAge, profile, roommates]);

  return (
    <main className="min-h-[70vh] bg-[#fbf8f3]">
      <section className="border-y border-[#eadfce] bg-[#f5efe5]">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#16110f] sm:text-5xl">
            Find Roommates
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-[#9a6e56]">
            Discover compatible roommates based on lifestyle, budget, and location.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="City">
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                {cityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Gender">
              <select value={gender} onChange={(event) => setGender(event.target.value as Gender | "all")}>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Min Age">
              <input
                type="number"
                min="18"
                value={minAge}
                onChange={(event) => setMinAge(event.target.value)}
              />
            </Field>

            <Field label="Max Age">
              <input
                type="number"
                min="18"
                value={maxAge}
                onChange={(event) => setMaxAge(event.target.value)}
              />
            </Field>

            <Field label="Max Budget">
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
            <span className="font-semibold text-[#1b1715]">{filteredRoommates.length}</span> roommate
            {filteredRoommates.length === 1 ? "" : "s"} found
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
            <h2 className="text-xl font-bold text-[#16110f]">Roommates unavailable</h2>
            <p className="mt-2 text-sm text-foreground/65">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#12b000] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#109900]"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && filteredRoommates.length === 0 ? (
          <div className="rounded-[2rem] border border-[#ece1d3] bg-white p-10 text-center shadow-soft">
            <h2 className="text-2xl font-bold text-[#16110f]">No roommate profiles match these filters</h2>
            <p className="mt-3 text-sm text-foreground/60">
              Try widening the age, budget, or city filters to discover more people.
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

function getUniversityCity(profile: UserProfile) {
  const value = profile.university.toLowerCase();

  if (value.includes("nazarbayev") || value.includes("astana")) return "Astana";
  if (value.includes("sdu")) return "Almaty";
  if (value.includes("kimep")) return "Almaty";
  if (value.includes("kaznu")) return "Almaty";
  if (value.includes("kbtu")) return "Almaty";

  return "Almaty";
}
