"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useLocale } from "@/context/locale-context";
import { DEFAULT_PLATFORM_SETTINGS, getPublicSettings, type PlatformSettings } from "@/lib/data/public-settings";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 4 3 11.3l6.7 2.4L18 7l-6 7 5 3L21 4Z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 11.6A8.4 8.4 0 0 1 7.2 18.9L4 20l1.2-3A8.4 8.4 0 1 1 20 11.6Z" />
      <path d="M9.4 8.8c.2-.4.5-.4.7-.4h.6c.2 0 .4 0 .5.3l.8 1.8c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.2-.1.4.3.5.8 1 1.3 1.4.5.3 1 .6 1.6.8.1.1.2 0 .4-.1l.7-.8c.1-.2.4-.2.5-.1l1.7.8c.2.1.3.3.3.5v.5c0 .3-.1.6-.4.7-.5.3-1.1.4-1.7.3-1.1-.2-2.1-.7-3.1-1.3a9 9 0 0 1-2.4-2.4c-.6-.9-1.1-2-1.3-3-.1-.6 0-1.2.3-1.8Z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 8.5h2.5V5.5H14c-1.9 0-3.5 1.6-3.5 3.5v2H8.5v3H10.5V20h3v-6.5h2.3l.7-3H13.5V9c0-.3.2-.5.5-.5Z" />
    </svg>
  )
};

const DEFAULT_SOCIAL_LINKS = { instagram: "https://instagram.com", telegram: "https://t.me", whatsapp: "https://wa.me" };

export function Footer() {
  const { t } = useLocale();
  const [platform, setPlatform] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);

  useEffect(() => {
    void getPublicSettings().then((settings) => setPlatform(settings.platform));
  }, []);

  const socialEntries = Object.entries({ ...DEFAULT_SOCIAL_LINKS, ...platform.socialLinks }).filter(
    ([, href]) => href
  ) as Array<[string, string]>;

  const platformLinks = [
    { label: t("footer.browseRooms"), href: "/rooms" },
    { label: t("footer.findRoommates"), href: "/roommates" },
    { label: t("footer.universities"), href: "/universities" }
  ];

  const supportLinks = [
    { label: t("footer.supportCenter"), href: "/support" },
    { label: t("footer.safety"), href: "/safety" },
    { label: t("footer.terms"), href: "/terms" },
    { label: t("footer.privacy"), href: "/privacy" }
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:px-6 sm:py-10 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="font-heading text-2xl font-bold text-foreground">
            {platform.siteName ? (
              platform.siteName
            ) : (
              <>
                Room<span className="text-primary">i</span>
              </>
            )}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/60">{t("footer.tagline")}</p>
          {platform.contactEmail || platform.contactPhone ? (
            <p className="mt-2 text-sm text-foreground/60">
              {platform.contactEmail ? <a href={`mailto:${platform.contactEmail}`} className="hover:text-primary">{platform.contactEmail}</a> : null}
              {platform.contactEmail && platform.contactPhone ? " · " : ""}
              {platform.contactPhone ? <a href={`tel:${platform.contactPhone}`} className="hover:text-primary">{platform.contactPhone}</a> : null}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
            {socialEntries.map(([key, href]) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={key}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-4 py-2 text-sm font-semibold text-foreground/70 transition hover:border-primary hover:text-primary"
              >
                {SOCIAL_ICONS[key]}
                <span className="hidden capitalize sm:inline">{key}</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-heading font-bold text-foreground">{t("footer.platform")}</h3>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            {platformLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-heading font-bold text-foreground">{t("footer.support")}</h3>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            {supportLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-foreground/50">
        {/* getUTCFullYear so server (UTC) and client (local TZ) can't disagree
            during the New-Year window — avoids a hydration mismatch. */}
        {platform.footerText || `© ${new Date().getUTCFullYear()} ${platform.siteName || "Roomi"}. ${t("footer.rights")}`}
      </div>
    </footer>
  );
}
