import type { Metadata } from "next";

import { TermsContent } from "./content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Roomi, the roommate and housing platform for Kazakhstan.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return <TermsContent />;
}
