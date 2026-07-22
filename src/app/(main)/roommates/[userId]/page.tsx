import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicProfileByIdServer } from "@/lib/data/profiles-server";

import RoommateDetailClient from "./roommate-detail-client";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ userId: string }>;
}

// PRIVACY: roommate pages are public and server-rendered (fast, shareable), but
// individual student profiles are deliberately kept OUT of the search index —
// we don't want real people's names/photos indexed by crawlers. Listings are
// indexed; personal profiles are not. Flip `index` to true only with an explicit
// product/privacy decision.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getPublicProfileByIdServer(userId);

  if (!profile) {
    return { title: "Roommate not found", robots: { index: false, follow: false } };
  }

  return {
    title: `${profile.fullName} — Roommate profile`,
    description: (profile.bio || `${profile.fullName} is looking for a roommate on Roomi.`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    robots: { index: false, follow: true },
    alternates: { canonical: `/roommates/${profile.uid}` }
  };
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  const profile = await getPublicProfileByIdServer(userId);

  if (!profile) notFound();

  return <RoommateDetailClient userId={profile.uid} initialProfile={profile} />;
}
