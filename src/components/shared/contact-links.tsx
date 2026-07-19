"use client";

import { Phone, Send } from "lucide-react";

import { useLocale } from "@/context/locale-context";
import {
  formatPhone,
  isValidPhone,
  isValidTelegram,
  phoneLink,
  telegramHandle,
  telegramLink
} from "@/lib/utils/contacts";

/**
 * Renders a profile's optional Telegram / phone contacts as clickable pills.
 * Respects the admin `contactsHidden` moderation flag and renders nothing when
 * there are no valid contacts to show.
 */
export function ContactLinks({
  telegram,
  phone,
  contactsHidden = false,
  size = "md"
}: {
  telegram?: string | null;
  phone?: string | null;
  contactsHidden?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useLocale();

  if (contactsHidden) return null;

  const hasTelegram = Boolean(telegram && isValidTelegram(telegram));
  const hasPhone = Boolean(phone && isValidPhone(phone));
  if (!hasTelegram && !hasPhone) return null;

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex flex-wrap gap-2">
      {hasTelegram ? (
        <a
          href={telegramLink(telegram!)}
          target="_blank"
          rel="noreferrer"
          aria-label={t("shared.contactViaTelegram")}
          className={`inline-flex items-center gap-2 rounded-full border border-[#2AABEE]/30 bg-[#2AABEE]/10 font-semibold text-[#1c8fc9] transition hover:bg-[#2AABEE]/20 ${padding}`}
        >
          <Send className={iconSize} />
          {telegramHandle(telegram!)}
        </a>
      ) : null}
      {hasPhone ? (
        <a
          href={phoneLink(phone!)}
          aria-label={t("shared.contactViaPhone")}
          className={`inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 font-semibold text-primary transition hover:bg-primary/20 ${padding}`}
        >
          <Phone className={iconSize} />
          {formatPhone(phone!)}
        </a>
      ) : null}
    </div>
  );
}
