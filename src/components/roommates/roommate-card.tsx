import { BadgeCheck, CalendarDays, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteRoommateButton } from "@/components/favorites/favorite-roommate-button";
import { CompatibilityBar } from "@/components/roommates/compatibility-bar";
import { useLocale } from "@/context/locale-context";
import { getUniversityCity } from "@/lib/constants/universities";
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
  const { t, locale } = useLocale();
  const score = calculateCompatibilityScore(currentUser, profile);
  const lifestyleTags = getLifestyleTags(profile.lifestyle, t);
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
          <p className="line-clamp-2 text-[15px] text-[#9a6e56]">
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
          {formatMoveInDate(profile.preferredMoveInDate, t("roommateDetail.flexible"), locale)}
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

function formatMoveInDate(date: Date | null, flexibleLabel: string, locale: string) {
  if (!date) return flexibleLabel;

  return new Intl.DateTimeFormat(locale === "kz" ? "kk" : locale, {
    month: "short",
    day: "numeric"
  }).format(date);
}

function getLifestyleTags(lifestyle: LifestylePreferences, t: (key: string) => string) {
  return [
    t(getCleanlinessLabelKey(lifestyle.cleanliness)),
    t(getSleepScheduleLabelKey(lifestyle.sleepSchedule)),
    t(getGuestsLabelKey(lifestyle.guests))
  ];
}

function getCleanlinessLabelKey(value: LifestylePreferences["cleanliness"]) {
  if (value === "very_clean") return "onboarding.cleanlinessVeryClean";
  if (value === "moderate") return "onboarding.cleanlinessModerate";
  return "onboarding.cleanlinessRelaxed";
}

function getSleepScheduleLabelKey(value: LifestylePreferences["sleepSchedule"]) {
  if (value === "early_bird") return "onboarding.sleepEarlyBird";
  if (value === "night_owl") return "onboarding.sleepNightOwl";
  return "onboarding.sleepBalanced";
}

function getGuestsLabelKey(value: LifestylePreferences["guests"]) {
  if (value === "rarely") return "onboarding.guestsRarely";
  if (value === "often") return "onboarding.guestsOften";
  return "onboarding.guestsSometimes";
}
