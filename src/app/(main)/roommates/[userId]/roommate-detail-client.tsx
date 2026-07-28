"use client";

import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Coins,
  GraduationCap,
  MapPin,
  MessageCircle,
  ShieldCheck
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FavoriteRoommateButton } from "@/components/favorites/favorite-roommate-button";
import { ContactLinks } from "@/components/shared/contact-links";
import { getUniversityCity } from "@/lib/constants/universities";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { createConversation } from "@/hooks/use-conversations";
import { getProfileById } from "@/lib/data/profiles";
import { calculateCompatibilityScore, compatibilityTierKey } from "@/lib/utils/compatibility";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import type { UserProfile } from "@/types/user";

const LIFESTYLE_LABEL_KEYS: Record<keyof UserProfile["lifestyle"], string> = {
  smoking: "onboarding.smokingLabel",
  pets: "onboarding.petsLabel",
  cleanliness: "onboarding.cleanlinessLabel",
  sleepSchedule: "onboarding.sleepScheduleLabel",
  guests: "onboarding.guestsLabel"
};

const LIFESTYLE_VALUE_KEYS: Record<string, string> = {
  no: "onboarding.smokingNo",
  outside: "onboarding.smokingOutside",
  yes: "onboarding.smokingYes",
  no_preference: "onboarding.noPreference",
  no_pets: "onboarding.petsNo",
  pet_friendly: "onboarding.petsFriendly",
  has_pets: "onboarding.petsHas",
  relaxed: "onboarding.cleanlinessRelaxed",
  moderate: "onboarding.cleanlinessModerate",
  very_clean: "onboarding.cleanlinessVeryClean",
  early_bird: "onboarding.sleepEarlyBird",
  balanced: "onboarding.sleepBalanced",
  night_owl: "onboarding.sleepNightOwl",
  rarely: "onboarding.guestsRarely",
  sometimes: "onboarding.guestsSometimes",
  often: "onboarding.guestsOften"
};

export default function RoommateDetailClient({
  userId,
  initialProfile
}: {
  userId: string;
  initialProfile: UserProfile | null;
}) {
  const router = useRouter();
  const { user, profile: currentProfile } = useAuth();
  const { t, locale } = useLocale();
  // Seed from server-provided public data (SSR), then re-fetch client-side to
  // reveal contacts to signed-in users.
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const nextProfile = await getProfileById(userId);
        if (!cancelled) {
          if (nextProfile) setProfile(nextProfile);
          setError(nextProfile || initialProfile ? null : t("roommateDetail.profileNotFound"));
        }
      } catch {
        if (!cancelled && !initialProfile) {
          setError(t("roommateDetail.couldNotLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, t, initialProfile]);

  const score = useMemo(() => calculateCompatibilityScore(currentProfile, profile), [currentProfile, profile]);
  const city = profile ? getUniversityCity(profile.university) : "";

  async function handleMessage() {
    if (!profile) return;
    if (!user) {
      router.push(`/sign-in?redirect=/roommates/${profile.uid}`);
      return;
    }

    setMessageLoading(true);
    try {
      const conversationId = await createConversation({
        participantIds: [user.uid, profile.uid],
        listingTitle: `${profile.fullName} roommate profile`
      });
      router.push(`/inbox/${conversationId}`);
    } finally {
      setMessageLoading(false);
    }
  }

  if (loading && !profile) {
    return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{t("roommateDetail.loadingProfile")}</main>;
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <StatusBanner tone="error" message={error || t("roommateDetail.profileNotFound")} />
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[#faf6ef]">
      <section className="border-b border-[#eadfce] bg-[#f7f1e7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="flex gap-4 sm:gap-5">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#efe7dc] sm:h-40 sm:w-40 sm:rounded-[2rem]">
              {profile.photoURL ? (
                <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="160px" />
              ) : (
                <div className="grid h-full place-items-center text-3xl font-bold text-primary sm:text-5xl">
                  {profile.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}

              {profile.verified ? (
                <span className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full border-2 border-[#f7f1e7] bg-[#0f957d] text-white sm:bottom-3 sm:right-3 sm:h-11 sm:w-11 sm:border-4">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
              ) : null}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight sm:text-4xl">{profile.fullName}</h1>

              {score > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#0f957d] px-3 py-1 text-sm font-semibold text-white sm:px-4 sm:py-1.5 sm:text-base">
                    {score}% {t("roommateDetail.matchSuffix")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f4ee] px-3 py-1 text-xs font-semibold text-[#0f7a63] sm:text-sm">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t(compatibilityTierKey(score))}
                  </span>
                </div>
              ) : null}

              <p className="mt-2 text-sm text-[#9a6e56] sm:mt-3 sm:text-lg">
                {profile.age} {t("roommateDetail.yearsOld")} · {profile.occupation}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#9a6e56] sm:text-lg">
                <MapPin className="h-4 w-4 shrink-0" />
                {city}, {t("roommateDetail.kazakhstan")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleMessage()}
              disabled={messageLoading}
              className="inline-flex items-center gap-2 rounded-full bg-[#0f957d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d856f] disabled:opacity-60 sm:px-7 sm:py-3 sm:text-base"
            >
              <MessageCircle className="h-4 w-4" />
              {messageLoading ? t("roommateDetail.opening") : t("roommateDetail.message")}
            </button>
            <div className="rounded-full border border-[#d9c9b7] bg-white p-1.5 sm:p-2">
              <FavoriteRoommateButton roommateId={profile.uid} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          <section>
            <h2 className="text-lg font-bold sm:text-2xl">
              {t("roommateDetail.aboutPrefix")} {profile.fullName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7e5f4b] sm:mt-3 sm:text-base sm:leading-7">
              {profile.bio || t("roommateDetail.defaultBio")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold sm:text-2xl">{t("roommateDetail.housingDetailsTitle")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
              <FactCard
                icon={<GraduationCap className="h-4 w-4" />}
                label={t("roommates.university")}
                value={profile.university || "—"}
              />
              <FactCard
                icon={<Briefcase className="h-4 w-4" />}
                label={t("onboarding.occupationLabel")}
                value={profile.occupation || "—"}
              />
              <FactCard
                icon={<Coins className="h-4 w-4" />}
                label={t("roommateDetail.budgetLabel")}
                value={`${formatCurrency(profile.maxBudget)} ${t("roommateDetail.perMonth")}`}
              />
              <FactCard
                icon={<CalendarDays className="h-4 w-4" />}
                label={t("roommateDetail.moveDateLabel")}
                value={
                  profile.preferredMoveInDate
                    ? formatDateShort(profile.preferredMoveInDate, locale)
                    : t("roommateDetail.flexible")
                }
              />
              <FactCard icon={<MapPin className="h-4 w-4" />} label={t("roommateDetail.cityLabel")} value={city || "—"} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold sm:text-2xl">{t("roommateDetail.lifestylePreferencesTitle")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
              {Object.entries(profile.lifestyle).map(([key, value]) => (
                <FactCard
                  key={key}
                  label={t(LIFESTYLE_LABEL_KEYS[key as keyof UserProfile["lifestyle"]] ?? key)}
                  value={t(LIFESTYLE_VALUE_KEYS[value] ?? value)}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-soft sm:rounded-[1.75rem] sm:p-6">
            {score > 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f1e7] px-4 py-3">
                <span className="text-sm font-semibold text-[#7e5f4b]">{t("shared.compatibility")}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[#0f957d] sm:text-2xl">{score}%</span>
                  <span className="rounded-full bg-[#e7f4ee] px-2.5 py-0.5 text-xs font-semibold text-[#0f7a63]">
                    {t(compatibilityTierKey(score))}
                  </span>
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleMessage()}
              disabled={messageLoading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f957d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0d856f] disabled:opacity-60 sm:text-base"
            >
              <MessageCircle className="h-4 w-4" />
              {t("roommateDetail.sendMessage")}
            </button>

            <div className="mt-3 flex justify-center rounded-full bg-[#f7f1e7] px-4 py-2.5">
              <FavoriteRoommateButton roommateId={profile.uid} showLabel />
            </div>

            <div className="mt-3 flex justify-center">
              <ContactLinks telegram={profile.telegram} phone={profile.phone} contactsHidden={profile.contactsHidden} />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function FactCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#f7f1e7] p-3 sm:rounded-2xl sm:p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9a6e56] sm:text-xs">
        {icon ? <span className="text-[#0f957d]">{icon}</span> : null}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-foreground sm:text-base">{value}</div>
    </div>
  );
}
