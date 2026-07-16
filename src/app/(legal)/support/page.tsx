import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

const SUPPORT_EMAIL = "roomi.support@gmail.com";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with Roomi — contact our support team, report a problem with a listing or profile, or ask about your account.",
  alternates: { canonical: "/support" }
};

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      updated="July 2026"
      intro="Need a hand? Our team is here to help with anything on Roomi — account questions, listings, roommate matches, verification, or reporting a problem. We typically reply within one business day."
      sections={[
        {
          heading: "Contact us",
          body: (
            <div className="space-y-4">
              <p>
                The fastest way to reach us is by email. Tap the address below to open your mail app with a
                message ready to send.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Roomi support request")}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                Email {SUPPORT_EMAIL}
              </a>
              <p className="text-foreground/60">
                Prefer to copy it?{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          )
        },
        {
          heading: "Reporting a listing or profile",
          paragraphs: [
            "If a listing or profile looks fake, abusive, or fraudulent, use the Report button directly on that listing or profile — it routes straight to our moderation team for review and removal.",
            "For anything urgent involving your safety, contact the police at 102. See our Safety & Security page for step-by-step guidance on meeting, viewing, and deposits."
          ]
        },
        {
          heading: "Account help",
          list: [
            "Trouble signing in or resetting your password — email us and we'll help you recover access.",
            "Want your account or a listing removed — email us from the address on your account and we'll take care of it.",
            "Questions about verification, matches, or how Roomi works — we're happy to walk you through it."
          ]
        },
        {
          heading: "Before you email",
          paragraphs: [
            "To help us resolve things quickly, include the email address on your account and, where relevant, a link to the listing or profile involved and a short description of what happened."
          ]
        }
      ]}
    />
  );
}
