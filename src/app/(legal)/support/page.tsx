import type { Metadata } from "next";

import { SupportContent } from "./content";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with Roomi — contact our support team, report a problem with a listing or profile, or ask about your account.",
  alternates: { canonical: "/support" }
};

export default function SupportPage() {
  return <SupportContent />;
}
