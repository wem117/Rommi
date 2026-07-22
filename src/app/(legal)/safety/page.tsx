import type { Metadata } from "next";

import { SafetyContent } from "./content";

export const metadata: Metadata = {
  title: "Safety & Security",
  description:
    "How to stay safe finding roommates and rentals in Kazakhstan — verifying people, viewing rooms, handling deposits, and avoiding scams.",
  alternates: { canonical: "/safety" }
};

export default function SafetyPage() {
  return <SafetyContent />;
}
