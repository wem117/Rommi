import Image from "next/image";
import Link from "next/link";

import { CompatibilityBar } from "@/components/roommates/compatibility-bar";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { calculateCompatibilityScore } from "@/lib/utils/compatibility";
import type { UserProfile } from "@/types/user";

export function RoommateCard({ profile, currentUser }: { profile: UserProfile; currentUser?: UserProfile | null }) {
  const score = calculateCompatibilityScore(currentUser, profile);

  return (
    <Link href={`/roommates/${profile.uid}`} className="rounded-2xl bg-white p-5 shadow-soft transition hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-background">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.fullName} fill className="object-cover" sizes="64px" />
          ) : (
            <div className="grid h-full place-items-center text-xl font-bold text-primary">
              {profile.fullName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-heading text-lg font-bold">{profile.fullName}</h3>
            <VerifiedBadge verified={profile.verified} />
          </div>
          <p className="mt-1 text-sm text-foreground/60">{profile.university}</p>
          <p className="mt-1 text-sm text-foreground/60">
            {profile.minBudget} - {profile.maxBudget} KZT
          </p>
        </div>
      </div>
      <div className="mt-5">
        <CompatibilityBar score={score} />
      </div>
    </Link>
  );
}
