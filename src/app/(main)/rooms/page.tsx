import type { Metadata } from "next";

import { getListingsFirstPageServer } from "@/lib/data/listings-server";

import RoomsClient from "./rooms-client";

// Server-rendered browse landing with ISR: the first page of listings is in the
// initial HTML (SEO + fast first paint); the client island takes over for
// filtering, search, pagination, and the map toggle.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Browse rooms & apartments for rent",
  description:
    "Browse student rooms and apartments for rent across Kazakhstan. Filter by city, university, budget, and lifestyle, then message the owner directly.",
  alternates: { canonical: "/rooms" }
};

export default async function Page() {
  const initial = await getListingsFirstPageServer(9);
  return <RoomsClient initial={initial} />;
}
