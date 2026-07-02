import { BadgeCheck, CalendarDays, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteRoommateButton } from "@/components/favorites/favorite-roommate-button";
import { CompatibilityBar } from "@/components/roommates/compatibility-bar";
import { useLocale } from "@/context/locale-context";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { formatCurrency } from "@/lib/utils/format";
import type { LifestylePreferences, UserProfile } from "@/types/user";

export function RoommateCard({
  profile,
  currentUser
}: {
  profile: UserProfile;
  currentUser?: UserProfile | null;
}) {
  const { t } = useLocale();
  const score = calculateCompatibilityScore(currentUser, profile);
  const lifestyleTags = getLifestyleTags(profile.lifestyle);
  const city = getUniversityCity(profile.university);

  return (
    <article className="rounded-[2rem] border border-[#eadfce] bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#efe7dc]">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="grid h-full place-items-center text-2xl font-bold text-[#12b000]">
              {profile.fullName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[1.85rem] font-semibold leading-none text-[#16110f]">
              {profile.fullName}
            </h3>
            {profile.verified ? <BadgeCheck className="h-5 w-5 shrink-0 fill-[#0f8d00] text-[#0f8d00]" /> : null}
          </div>
          <p className="mt-2 text-[15px] text-[#9a6e56]">
            {profile.age} · {profile.occupation}
          </p>
          <p className="text-[15px] text-[#9a6e56]">
            {profile.university} · {city}
          </p>
        </div>

        <FavoriteRoommateButton roommateId={profile.uid} />
      </div>

      <div className="mt-6">
        <CompatibilityBar score={score} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3 rounded-[1.4rem] bg-[#f4ede3] px-5 py-4 text-[15px] text-[#9a6e56]">
        <span className="inline-flex items-center gap-2">
          <Coins className="h-4 w-4 text-[#a87458]" />
          {formatCurrency(profile.maxBudget)}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#a87458]" />
          {formatMoveInDate(profile.preferredMoveInDate)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {lifestyleTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#f2e7db] px-3.5 py-1.5 text-sm font-medium text-[#7b583f]"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-5 line-clamp-3 text-[15px] leading-8 text-[#8a644f]">
        {profile.bio ||
          t("roommates.cardFallbackBio")}
      </p>

      <Link
        href={`/roommates/${profile.uid}`}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#12b000] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#109900]"
      >
        {t("roommates.connect")}
      </Link>
    </article>
  );
}

function formatMoveInDate(date: Date | null) {
  if (!date) return "Flexible";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function getLifestyleTags(lifestyle: LifestylePreferences) {
  return [
    getCleanlinessLabel(lifestyle.cleanliness),
    getSleepScheduleLabel(lifestyle.sleepSchedule),
    getGuestsLabel(lifestyle.guests)
  ];
}

function getCleanlinessLabel(value: LifestylePreferences["cleanliness"]) {
  if (value === "very_clean") return "Very clean";
  if (value === "moderate") return "Moderate";
  return "Relaxed";
}

function getSleepScheduleLabel(value: LifestylePreferences["sleepSchedule"]) {
  if (value === "early_bird") return "Early bird";
  if (value === "night_owl") return "Night owl";
  return "Balanced";
}

function getGuestsLabel(value: LifestylePreferences["guests"]) {
  if (value === "rarely") return "Rarely";
  if (value === "often") return "Often";
  return "Occasional";
}

function getUniversityCity(university: string) {
  const value = university.toLowerCase();

  if (value.includes("nazarbayev") || value.includes("astana")) return "Astana";
  if (value.includes("kimep")) return "Almaty";
  if (value.includes("kaznu")) return "Almaty";
  if (value.includes("kbtu")) return "Almaty";
  if (value.includes("sdu")) return "Almaty";

  return "Almaty";
}
