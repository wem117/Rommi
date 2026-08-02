"use client";

import { Instagram, MessageCircle, Phone, Send } from "lucide-react";

import { useLocale } from "@/context/locale-context";
import {
  formatPhone,
  instagramHandle,
  instagramLink,
  isValidInstagram,
  isValidPhone,
  isValidTelegram,
  phoneLink,
  telegramHandle,
  telegramLink,
  whatsappLink
} from "@/lib/utils/contacts";

/**
 * A profile's optional contact methods as clickable pills.
 *
 * Respects the admin `contactsHidden` moderation flag and renders nothing when
 * there is no valid contact to show — so a profile with none looks deliberate
 * rather than broken. Each method is validated before it is rendered: a
 * mistyped handle produces no pill instead of a link to nowhere.
 */
export function ContactLinks({
  telegram,
  phone,
  whatsapp,
  instagram,
  contactsHidden = false,
  size = "md"
}: {
  telegram?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  contactsHidden?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useLocale();

  if (contactsHidden) return null;

  const hasTelegram = Boolean(telegram && isValidTelegram(telegram));
  const hasPhone = Boolean(phone && isValidPhone(phone));
  const hasWhatsapp = Boolean(whatsapp && isValidPhone(whatsapp));
  const hasInstagram = Boolean(instagram && isValidInstagram(instagram));
  if (!hasTelegram && !hasPhone && !hasWhatsapp && !hasInstagram) return null;

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const pill = `inline-flex items-center gap-2 rounded-full border font-semibold transition ${padding}`;

  return (
    <div className="flex flex-wrap gap-2">
      {hasTelegram ? (
        <a
          href={telegramLink(telegram!)}
          target="_blank"
          rel="noreferrer"
          aria-label={t("shared.contactViaTelegram")}
          className={`${pill} border-[#2AABEE]/30 bg-[#2AABEE]/10 text-[#1c8fc9] hover:bg-[#2AABEE]/20`}
        >
          <Send className={iconSize} />
          {telegramHandle(telegram!)}
        </a>
      ) : null}
      {hasWhatsapp ? (
        <a
          href={whatsappLink(whatsapp!)}
          target="_blank"
          rel="noreferrer"
          aria-label={t("shared.contactViaWhatsapp")}
          className={`${pill} border-[#25D366]/35 bg-[#25D366]/10 text-[#128C4A] hover:bg-[#25D366]/20`}
        >
          <MessageCircle className={iconSize} />
          {formatPhone(whatsapp!)}
        </a>
      ) : null}
      {hasInstagram ? (
        <a
          href={instagramLink(instagram!)}
          target="_blank"
          rel="noreferrer"
          aria-label={t("shared.contactViaInstagram")}
          className={`${pill} border-[#C13584]/30 bg-[#C13584]/10 text-[#a52b70] hover:bg-[#C13584]/20`}
        >
          <Instagram className={iconSize} />
          {instagramHandle(instagram!)}
        </a>
      ) : null}
      {hasPhone ? (
        <a
          href={phoneLink(phone!)}
          aria-label={t("shared.contactViaPhone")}
          className={`${pill} border-primary/25 bg-primary/10 text-primary hover:bg-primary/20`}
        >
          <Phone className={iconSize} />
          {formatPhone(phone!)}
        </a>
      ) : null}
    </div>
  );
}
