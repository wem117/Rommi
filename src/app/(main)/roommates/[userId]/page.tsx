import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicProfileByIdServer } from "@/lib/data/profiles-server";
import { getPublicContacts } from "@/lib/data/public-contacts";
import { requirePageAuth } from "@/lib/supabase/page-auth";

import RoommateDetailClient from "./roommate-detail-client";

// Auth-gated detail page: guests are redirected to sign-in (see the server auth
// guard in the default export). Server-rendered per signed-in user, so it
// renders dynamically rather than via shared ISR. Roommate profiles are also
// kept out of the search index (personal data).
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ userId: string }>;
}

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

  // Server-side authorization: guests are redirected to sign-in with a return
  // URL before any profile data is fetched or rendered.
  await requirePageAuth(`/roommates/${userId}`);

  const profile = await getPublicProfileByIdServer(userId);

  if (!profile) notFound();

  // WhatsApp and Instagram have no column on `profiles`, so they are read here,
  // server-side, behind the auth guard above — the same "signed-in visitors
  // only" rule the telegram/phone columns follow at the database.
  const contacts = await getPublicContacts(profile.uid);

  return <RoommateDetailClient userId={profile.uid} initialProfile={profile} contacts={contacts} />;
}
