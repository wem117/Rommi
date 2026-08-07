"use client";

import { BadgeCheck, CalendarCheck, Lock, ShieldCheck } from "lucide-react";

import { useLocale } from "@/context/locale-context";

/**
 * Trust signals.
 *
 * A hard rule runs through this file: **every signal here is backed by a real
 * column.** `verified` and `verified_at` are set by a human admin reviewing a
 * document; `created_at` is when the account was actually made.
 *
 * What is deliberately NOT here is as important. No review stars, no "responds
 * within an hour", no "3 people are viewing this" — the platform stores none of
 * those, so rendering them would be inventing credibility on a page whose whole
 * job is to help a student decide whether a stranger is safe to meet. A trust
 * signal that is not true is worse than no signal, because it spends the
 * credibility of the ones that are.
 *
 * When the data to support reviews or response times exists, they belong here.
 */

type Size = "sm" | "md";

const CHIP: Record<Size, string> = {
  sm: "gap-1 px-2 py-0.5 text-[11px]",
  md: "gap-1.5 px-2.5 py-1 text-xs"
};
const ICON: Record<Size, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5"
};

/**
 * Identity-verified marker. Renders nothing when the person is not verified —
 * absence is not a negative claim, and a greyed-out "unverified" badge would
 * read as one on the 100 of 111 accounts that simply have not applied.
 */
export function VerifiedBadge({ verified, size = "md" }: { verified?: boolean; size?: Size }) {
  const { t } = useLocale();
  if (!verified) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-success/10 font-semibold text-success ring-1 ring-inset ring-success/20 ${CHIP[size]}`}
    >
      <BadgeCheck className={ICON[size]} aria-hidden="true" />
      {t("listingDetail.verified")}
    </span>
  );
}

/**
 * Compact verified tick for dense surfaces (listing cards), where the full chip
 * would compete with the price for attention.
 *
 * The label still ships, visually hidden: a bare icon is meaningless to a screen
 * reader, and "verified" is precisely the information a blind user needs most.
 */
export function VerifiedTick({ verified, className = "" }: { verified?: boolean; className?: string }) {
  const { t } = useLocale();
  if (!verified) return null;

  return (
    <span className={`inline-flex items-center ${className}`}>
      <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
      <span className="sr-only">{t("listingDetail.verified")}</span>
    </span>
  );
}

/**
 * "Member since March 2024".
 *
 * Longevity is the cheapest honest trust signal a marketplace has: an account
 * that has existed for two years is materially less likely to be a throwaway.
 * Month precision, never a day — the exact signup date is personal information
 * that buys the reader nothing.
 */
export function MemberSince({ date, size = "md" }: { date?: Date | string | null; size?: Size }) {
  const { t, locale } = useLocale();
  if (!date) return null;

  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;

  const intlLocale = locale === "kz" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US";
  const when = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(parsed);

  return (
    <span className={`inline-flex items-center text-foreground/60 ${CHIP[size]} !px-0`}>
      <CalendarCheck className={ICON[size]} aria-hidden="true" />
      {t("trust.memberSince").replace("{date}", when)}
    </span>
  );
}

/**
 * Platform-level assurance strip for contact panels.
 *
 * States only what is verifiably true of this deployment: the connection is
 * encrypted, contact details are not shown to anonymous visitors, and every
 * listing passes human review before publication.
 */
export function SecurePlatformNote({ className = "" }: { className?: string }) {
  const { t } = useLocale();

  return (
    <p className={`flex items-start gap-2 text-xs leading-5 text-foreground/60 ${className}`}>
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
      <span>{t("trust.securePlatform")}</span>
    </p>
  );
}

/**
 * Safety guidance shown beside contact actions.
 *
 * Placed at the point of decision rather than on a policy page nobody opens —
 * the moment someone is about to message a stranger about money is the moment
 * the advice is worth anything.
 */
export function SafetyTips({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  const tips = [t("trust.safetyTip1"), t("trust.safetyTip2"), t("trust.safetyTip3")];

  return (
    <section
      className={`rounded-2xl border border-border/70 bg-surface-muted/50 p-4 ${className}`}
      aria-labelledby="safety-tips-heading"
    >
      <h3 id="safety-tips-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
        {t("trust.safetyTitle")}
      </h3>
      <ul className="mt-2.5 space-y-1.5">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2 text-xs leading-5 text-foreground/70">
            <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
