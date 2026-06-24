"use client";

import { Mail, Pencil, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { VerifiedBadge } from "@/components/shared/verified-badge";
import { useAuth } from "@/context/auth-context";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { profileCompletion } from "@/lib/utils/compatibility";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  if (!profile) return null;

  const completion = profile.profileCompletion ?? profileCompletion(profile);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{profile.fullName}</h1>
                <VerifiedBadge verified={profile.verified || user?.emailVerified} />
              </div>
              <p className="mt-2 text-foreground/65">{profile.bio || "No bio added yet."}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-foreground/65">
                <span>{profile.university}</span>
                <span>{profile.occupation}</span>
                <span>{profile.age} years old</span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </Link>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Profile completion</h2>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-2 text-sm font-medium text-foreground/65">{completion}% complete</p>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold">Housing preferences</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info label="Budget" value={`${formatCurrency(profile.minBudget)} - ${formatCurrency(profile.maxBudget)}`} />
            <Info label="Move-in" value={formatDate(profile.preferredMoveInDate)} />
            <Info label="Gender" value={profile.gender.replaceAll("_", " ")} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold">Lifestyle preferences</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(profile.lifestyle).map(([key, value]) => (
            <Info key={key} label={key.replace(/([A-Z])/g, " $1")} value={String(value).replaceAll("_", " ")} />
          ))}
        </div>
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
