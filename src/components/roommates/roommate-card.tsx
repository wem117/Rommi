"use client";

import { BadgeCheck, CalendarDays, Coins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FavoriteRoommateButton } from "@/components/favorites/favorite-roommate-button";
import { CompatibilityBar } from "@/components/roommates/compatibility-bar";
import { useLocale } from "@/context/locale-context";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import type { LifestylePreferences, UserProfile } from "@/types/user";
import { ageSegment, joinMeta } from "@/lib/utils/profile-display";
import { roommateCity } from "@/lib/utils/roommate-city";

export function RoommateCard({
  profile,
  currentUser
}: {
  profile: UserProfile;
  currentUser?: UserProfile | null;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const score = calculateCompatibilityScore(currentUser, profile);
  const lifestyleTags = getLifestyleTags(profile.lifestyle, t);
  // Stored city wins; university-derived is the legacy fallback.
  const city = roommateCity(profile);
  const href = `/roommates/${profile.uid}`;

  // Whole card is clickable (router.push instead of an <a> wrapper, because the
  // card contains interactive children — the favorite button and Connect link —
  // which must not be nested inside an anchor). Keyboard: Enter/Space navigate.
  return (
    /* A div, not an <article>: <article> has an implicit non-interactive role,
       and overriding that to "link" is a genuine ARIA conflict. The card cannot
       be an <a> because it contains its own interactive children (favourite,
       Connect), so it carries the role itself. */
    <div
      role="link"
      tabIndex={0}
      aria-label={profile.fullName}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="min-w-0 cursor-pointer overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:rounded-[2rem] sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface-muted sm:h-20 sm:w-20">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="grid h-full place-items-center text-xl font-bold text-primary sm:text-2xl">
              {profile.fullName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xl font-semibold leading-none text-foreground sm:text-[1.85rem]">
              {profile.fullName}
            </h3>
            {/* fill green + white check strokes; same-color fill/stroke rendered as a solid blob */}
            {profile.verified ? <BadgeCheck className="h-5 w-5 shrink-0 fill-success text-white" /> : null}
          </div>
          {/* Imported profiles often state only a name and a budget, so any of
              these can be missing. joinMeta drops what is absent instead of
              rendering "0 · " or a dangling separator. */}
          <p className="mt-1 break-words text-sm text-foreground/60 sm:mt-2 sm:text-[15px]">
            {joinMeta([ageSegment(profile.age), profile.occupation])}
          </p>
          <p className="line-clamp-2 break-words text-sm text-foreground/60 sm:text-[15px]">
            {joinMeta([profile.university, city])}
          </p>
        </div>

        <FavoriteRoommateButton roommateId={profile.uid} />
      </div>

      {score > 0 ? (
        <div className="mt-4 sm:mt-6">
          <CompatibilityBar score={score} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-[1.4rem] bg-surface-muted px-4 py-2.5 text-sm text-foreground/60 sm:mt-5 sm:gap-3 sm:px-5 sm:py-4 sm:text-[15px]">
        {profile.maxBudget > 0 ? (
          <span className="inline-flex items-center gap-2">
            <Coins className="h-4 w-4 text-foreground/60" />
            {formatCurrency(profile.maxBudget)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-foreground/60" />
          {profile.preferredMoveInDate
            ? formatDateShort(profile.preferredMoveInDate, locale)
            : t("roommateDetail.flexible")}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 sm:gap-2.5">
        {lifestyleTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground/60 sm:px-3.5 sm:py-1.5 sm:text-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-foreground/60 sm:mt-5 sm:line-clamp-3 sm:text-[15px] sm:leading-8">
        {profile.bio ||
          t("roommates.cardFallbackBio")}
      </p>

      <Link
        href={href}
        onClick={(event) => event.stopPropagation()}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95 sm:mt-6 sm:py-3"
      >
        {t("roommates.connect")}
      </Link>
    </div>
  );
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
