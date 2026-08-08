"use client";

import { BadgeCheck, Lock, ShieldCheck } from "lucide-react";

import { useLocale } from "@/context/locale-context";

/**
 * The trust band, sitting between the listings and the closing CTA.
 *
 * A student browsing rooms is being asked to meet a stranger and hand over a
 * deposit. That is the actual risk the product carries, and the homepage said
 * nothing about it — the marketplace pattern this site follows puts a
 * Trust/Safety section immediately before the final call to action for exactly
 * that reason, and it was the one section missing.
 *
 * EVERY CLAIM HERE IS TRUE OF THIS DEPLOYMENT, and each maps to something the
 * code actually does:
 *
 *   "Reviewed before it appears"  — listings are written as `pending` and an
 *                                   admin approves them; the listing form and
 *                                   the Telegram publish gate both refuse
 *                                   incomplete submissions outright.
 *   "Verified students"           — `profiles.verified`, set by a human admin
 *                                   against a document, shown as a badge.
 *   "Contacts stay private"       — RLS: phone/Telegram are not readable by
 *                                   anonymous visitors, only signed-in users.
 *
 * Deliberately absent: member counts, match counts, ratings, "trusted by N
 * students". Those are the numbers a marketing page would reach for and this
 * platform cannot substantiate any of them. An unverifiable trust claim is
 * worse than silence, because it spends the credibility of the true ones —
 * the same rule that governs components/shared/trust-signals.tsx.
 */

const PILLARS = [
  { icon: ShieldCheck, key: "reviewed" },
  { icon: BadgeCheck, key: "verified" },
  { icon: Lock, key: "private" }
] as const;

export function TrustSection() {
  const { t } = useLocale();

  return (
    <section
      className="bg-surface-muted/40 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="trust-heading"
            className="font-heading text-display-sm text-foreground sm:text-display-md"
          >
            {t("home.trustTitle")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-foreground/60 sm:text-base sm:leading-7">
            {t("home.trustSubtitle")}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="rounded-card border border-border/80 bg-card p-5 shadow-elev-2 sm:p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-success/10 text-success">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-heading text-base font-bold text-foreground sm:text-lg">
                {t(`home.trust_${key}_title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-foreground/65">
                {t(`home.trust_${key}_body`)}
              </p>
            </li>
          ))}
        </ul>

        {/* The safety guidance itself, reusing the same three lines shown beside
            the contact buttons on a listing. Repeating them here is deliberate:
            this is where someone forms an expectation of how the platform
            works, and the listing page is where they act on it. */}
        <div className="mt-6 rounded-card border border-border/70 bg-background/60 p-5 sm:mt-8 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground">{t("trust.safetyTitle")}</h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-3 sm:gap-4">
            {[t("trust.safetyTip1"), t("trust.safetyTip2"), t("trust.safetyTip3")].map((tip) => (
              <li key={tip} className="flex gap-2 text-xs leading-5 text-foreground/70">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
