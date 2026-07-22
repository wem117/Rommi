import type { Metadata } from "next";

import { getRoommatesFirstPageServer } from "@/lib/data/profiles-server";

import RoommatesClient from "./roommates-client";

// Server-rendered browse landing with ISR: roommate cards are in the initial
// HTML; the client island handles filtering and compatibility sorting.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Find a student roommate in Kazakhstan",
  description:
    "Browse verified students looking for roommates across Kazakhstan. Filter by city, university, age, gender, and budget, and match on lifestyle compatibility.",
  alternates: { canonical: "/roommates" }
};

export default async function Page() {
  const initial = await getRoommatesFirstPageServer(60);
  return <RoommatesClient initial={initial} />;
}
