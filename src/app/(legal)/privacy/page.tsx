import type { Metadata } from "next";

import { PrivacyContent } from "./content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Roomi collects, uses, and protects your personal data as a roommate and housing platform in Kazakhstan.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
