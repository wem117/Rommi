"use client";

import {
  CalendarDays,
  Coins,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { FavoriteRoommateButton } from "@/components/favorites/favorite-roommate-button";
import { getUniversityCity } from "@/lib/constants/universities";
import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import { createConversation } from "@/hooks/use-conversations";
import { getProfileById } from "@/lib/data/profiles";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { formatCurrency } from "@/lib/utils/format";
import type { UserProfile } from "@/types/user";

export default function RoommateDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user, profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const nextProfile = await getProfileById(userId);
        if (!cancelled) {
          setProfile(nextProfile);
          setError(nextProfile ? null : "Profile not found.");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load this roommate profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const score = useMemo(() => calculateCompatibilityScore(currentProfile, profile), [currentProfile, profile]);
  const city = profile ? getUniversityCity(profile.university) : "";
  const matchDetails = useMemo(() => getCompatibilityBreakdown(currentProfile, profile), [currentProfile, profile]);

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

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">Loading profile...</main>;
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <StatusBanner tone="error" message={error || "Profile not found."} />
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[#faf6ef]">
      <section className="border-b border-[#eadfce] bg-[#f7f1e7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative h-44 w-44 overflow-hidden rounded-[2rem] bg-[#efe7dc]">
              {profile.photoURL ? (
                <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="176px" />
              ) : (
                <div className="grid h-full place-items-center text-5xl font-bold text-primary">
                  {profile.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}

              {profile.verified ? (
                <span className="absolute bottom-3 right-3 grid h-12 w-12 place-items-center rounded-full border-4 border-[#f7f1e7] bg-[#0f957d] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              ) : null}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold">{profile.fullName}</h1>
                <span className="rounded-full bg-[#0f957d] px-5 py-2 text-lg font-semibold text-white">
                  {score}% Match
                </span>
              </div>

              <p className="mt-3 text-2xl text-[#9a6e56]">
                {profile.age} years old · {profile.occupation} · {profile.university}
              </p>
              <p className="mt-4 flex items-center gap-2 text-xl text-[#9a6e56]">
                <MapPin className="h-5 w-5" />
                {city}, Kazakhstan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleMessage()}
              disabled={messageLoading}
              className="inline-flex items-center gap-3 rounded-full bg-[#0f957d] px-8 py-4 text-xl font-semibold text-white transition hover:bg-[#0d856f] disabled:opacity-60"
            >
              <MessageCircle className="h-5 w-5" />
              {messageLoading ? "Opening..." : "Message"}
            </button>
            <div className="rounded-full border border-[#d9c9b7] bg-white p-2">
              <FavoriteRoommateButton roommateId={profile.uid} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_33rem] lg:px-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-4xl font-bold">About {profile.fullName}</h2>
            <p className="mt-5 text-xl leading-10 text-[#7e5f4b]">
              {profile.bio || "Quiet and clean. Looking for a roommate who respects personal space and shared routines."}
            </p>
          </section>

          <section>
            <h2 className="text-4xl font-bold">Housing Details</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Budget"
                value={formatCurrency(profile.maxBudget)}
                detail="per month"
                icon={<Coins className="h-5 w-5" />}
              />
              <MetricCard
                label="Move Date"
                value={formatMoveDate(profile.preferredMoveInDate)}
                detail={profile.preferredMoveInDate ? String(profile.preferredMoveInDate.getFullYear()) : "Flexible"}
                icon={<CalendarDays className="h-5 w-5" />}
              />
              <MetricCard
                label="City"
                value={city}
                detail="Kazakhstan"
                icon={<MapPin className="h-5 w-5" />}
              />
            </div>
          </section>

          <section>
            <h2 className="text-4xl font-bold">Compatibility Breakdown</h2>
            <div className="mt-6 space-y-6">
              {matchDetails.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xl font-semibold">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4ede3] text-[#0f957d]">
                        {item.icon}
                      </span>
                      {item.label}
                    </div>
                    <span className="text-xl font-bold">{item.score}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#ece3d7]">
                    <div className="h-full rounded-full bg-[#12b000]" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-4xl font-bold">Lifestyle Preferences</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(profile.lifestyle).map(([key, value]) => (
                <MetricCard
                  key={key}
                  label={formatLabel(key)}
                  value={formatPreference(value)}
                  detail=""
                  icon={<Sparkles className="h-5 w-5" />}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[2.2rem] border border-[#eadfce] bg-white p-8 shadow-soft">
            <div className="mx-auto grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#0f957d_0deg,var(--match-angle),#e9dfd3_var(--match-angle),#e9dfd3_360deg)]" style={{ ["--match-angle" as string]: `${Math.max(score, 4) * 3.6}deg` }}>
              <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center">
                <div>
                  <div className="text-5xl font-bold">{score}%</div>
                  <div className="text-2xl text-[#9a6e56]">Match</div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <h3 className="text-4xl font-bold">{score >= 85 ? "Great Match!" : score >= 65 ? "Promising Match" : "Needs a closer look"}</h3>
              <p className="mt-4 text-xl leading-9 text-[#9a6e56]">
                {currentProfile
                  ? `You and ${profile.fullName} share similar lifestyle preferences and budget.`
                  : `${profile.fullName} looks strongest on budget, lifestyle, and move-in timing.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleMessage()}
              disabled={messageLoading}
              className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#0f957d] px-6 py-5 text-2xl font-semibold text-white transition hover:bg-[#0d856f] disabled:opacity-60"
            >
              <MessageCircle className="h-5 w-5" />
              Send Message
            </button>

            <div className="mt-4 flex justify-center rounded-full bg-[#f7f1e7] px-5 py-4">
              <FavoriteRoommateButton roommateId={profile.uid} showLabel />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.8rem] bg-[#f7f1e7] p-6">
      <div className="mb-4 text-[#0f957d]">{icon}</div>
      <div className="text-xl text-[#9a6e56]">{label}</div>
      <div className="mt-2 text-4xl font-bold leading-tight">{value}</div>
      {detail ? <div className="mt-1 text-xl text-[#9a6e56]">{detail}</div> : null}
    </div>
  );
}

function formatMoveDate(date: Date | null) {
  if (!date) return "Flexible";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric"
  }).format(date);
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1");
}

function formatPreference(value: string) {
  return value.replaceAll("_", " ");
}

function getCompatibilityBreakdown(currentProfile?: UserProfile | null, profile?: UserProfile | null) {
  if (!profile) return [];

  const overall = calculateCompatibilityScore(currentProfile, profile);
  const budgetScore = currentProfile
    ? scoreBudgetOverlap(currentProfile.minBudget, currentProfile.maxBudget, profile.minBudget, profile.maxBudget)
    : Math.max(overall, 72);
  const lifestyleScore = currentProfile ? overall : 96;
  const moveInScore = currentProfile
    ? scoreMoveInTiming(currentProfile.preferredMoveInDate, profile.preferredMoveInDate)
    : 84;
  const cleanlinessScore = currentProfile
    ? currentProfile.lifestyle.cleanliness === profile.lifestyle.cleanliness
      ? 96
      : 74
    : profile.lifestyle.cleanliness === "very_clean"
      ? 92
      : 78;

  return [
    { label: "Budget Match", score: budgetScore, icon: <Coins className="h-5 w-5" /> },
    { label: "Lifestyle Fit", score: lifestyleScore, icon: <Sparkles className="h-5 w-5" /> },
    { label: "Move-in Timing", score: moveInScore, icon: <CalendarDays className="h-5 w-5" /> },
    { label: "Cleanliness Fit", score: cleanlinessScore, icon: <ShieldCheck className="h-5 w-5" /> }
  ];
}

function scoreBudgetOverlap(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number
) {
  const overlap = Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
  const range = Math.max(maxA, maxB) - Math.min(minA, minB);
  if (range <= 0) return 90;
  return Math.max(52, Math.round((overlap / range) * 100));
}

function scoreMoveInTiming(dateA: Date | null, dateB: Date | null) {
  if (!dateA || !dateB) return 82;
  const diffDays = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return 96;
  if (diffDays <= 21) return 88;
  if (diffDays <= 45) return 74;
  return 58;
}
