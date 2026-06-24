"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CompatibilityBar } from "@/components/roommates/compatibility-bar";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAuth } from "@/context/auth-context";
import { getProfileById } from "@/lib/data/profiles";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { UserProfile } from "@/types/user";

export default function RoommateDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const nextProfile = await getProfileById(userId);
      if (!cancelled) {
        setProfile(nextProfile);
        setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-10">Loading profile...</main>;
  if (!profile) return <main className="mx-auto max-w-4xl px-4 py-10">Profile not found.</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative h-28 w-28 overflow-hidden rounded-full bg-background">
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="112px" />
            ) : (
              <div className="grid h-full place-items-center text-4xl font-bold text-primary">
                {profile.fullName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{profile.fullName}</h1>
              <VerifiedBadge verified={profile.verified} />
            </div>
            <p className="mt-2 text-foreground/65">{profile.bio || "No bio added yet."}</p>
            <div className="mt-5 max-w-md">
              <CompatibilityBar score={calculateCompatibilityScore(currentProfile, profile)} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Info label="University" value={profile.university} />
          <Info label="Occupation" value={profile.occupation} />
          <Info label="Budget" value={`${formatCurrency(profile.minBudget)} - ${formatCurrency(profile.maxBudget)}`} />
          <Info label="Move-in" value={formatDate(profile.preferredMoveInDate)} />
          <Info label="Age" value={`${profile.age}`} />
          <Info label="Gender" value={profile.gender.replaceAll("_", " ")} />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(profile.lifestyle).map(([key, value]) => (
            <Info key={key} label={key.replace(/([A-Z])/g, " $1")} value={String(value).replaceAll("_", " ")} />
          ))}
        </div>

        {profile.email ? (
          <a
            href={`mailto:${profile.email}`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            <Mail className="h-4 w-4" />
            Contact
          </a>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="text-xs font-semibold uppercase text-foreground/50">{label}</div>
      <div className="mt-1 font-semibold capitalize">{value}</div>
    </div>
  );
}
