"use client";

import { BadgeCheck } from "lucide-react";

import { useLocale } from "@/context/locale-context";

export function VerifiedBadge({ verified }: { verified?: boolean }) {
  const { t } = useLocale();
  if (!verified) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
      <BadgeCheck className="h-3.5 w-3.5" />
      {t("listingDetail.verified")}
    </span>
  );
}
