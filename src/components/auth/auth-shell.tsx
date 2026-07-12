"use client";

import { ChevronRight, Home, ShieldCheck, UserRoundSearch, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageMenu } from "@/components/layout/language-menu";
import { useLocale } from "@/context/locale-context";

export function AuthShell({
  heading,
  subtitle,
  topCtaHref,
  topCtaLabel,
  footerPrompt,
  footerLinkHref,
  footerLinkLabel,
  children
}: {
  heading: string;
  subtitle: string;
  topCtaHref: string;
  topCtaLabel: string;
  footerPrompt: string;
  footerLinkHref: string;
  footerLinkLabel: string;
  children: ReactNode;
}) {
  const { t } = useLocale();

  const highlights = [
    { icon: ShieldCheck, title: t("auth.highlightVerifiedTitle"), subtitle: t("auth.highlightVerifiedSubtitle") },
    { icon: UserRoundSearch, title: t("auth.highlightMatchingTitle"), subtitle: t("auth.highlightMatchingSubtitle") },
    { icon: Zap, title: t("auth.highlightSetupTitle"), subtitle: t("auth.highlightSetupSubtitle") }
  ];

  return (
    <main className="min-h-screen overflow-x-clip bg-[#faf6ef] text-[#16110f]">
      <header className="border-b border-[#eadfce] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0f957d] text-white">
              <Home className="h-5 w-5" />
            </span>
            <span className="text-[2rem] font-bold leading-none">
              Room<span className="text-primary">i</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-12 text-[1.05rem] font-medium text-[#2e2622] md:flex">
            <Link href="/rooms" className="transition hover:text-[#12b000]">
              {t("nav.rooms")}
            </Link>
            <Link href="/roommates" className="transition hover:text-[#12b000]">
              {t("nav.roommates")}
            </Link>
            <Link href="/list-a-room/step-1" className="transition hover:text-[#12b000]">
              {t("nav.listRoom")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageMenu />
            <Link
              href={topCtaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#0f957d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d856f]"
            >
              {topCtaLabel}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="order-2 rounded-[2.5rem] border border-white/60 bg-[linear-gradient(180deg,#fffdf9_0%,#f6efe5_100%)] p-8 shadow-[0_24px_60px_rgba(58,33,10,0.08)] lg:order-1 lg:p-12">
          <Link href="/" className="inline-flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#0f957d] text-white shadow-lg">
              <Home className="h-7 w-7" />
            </span>
            <span className="text-5xl font-bold leading-none tracking-tight">
              Room<span className="text-primary">i</span>
            </span>
          </Link>

          <div className="mt-10 max-w-2xl">
            <h1 className="text-5xl font-bold leading-[0.96] sm:text-6xl lg:text-[5.25rem]">
              {t("auth.heroTitleLead")} <span className="text-[#0f957d]">{t("auth.heroTitleAccent")}</span>{" "}
              {t("auth.heroTitleSuffix")}
            </h1>
            <p className="mt-8 max-w-xl text-2xl leading-10 text-[#7f5e4a]">{t("auth.heroDescription")}</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-[1.75rem] bg-[#fff7ef] p-5">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#d8faf0] text-[#0f957d]">
                  <item.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-[1.8rem] font-bold leading-tight">{item.title}</h2>
                <p className="mt-2 text-lg leading-8 text-[#9a6e56]">{item.subtitle}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="order-1 rounded-[2.5rem] border border-[#eadfce] bg-white p-6 shadow-[0_24px_60px_rgba(58,33,10,0.08)] sm:p-8 lg:order-2 lg:p-10">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold sm:text-5xl">{heading}</h2>
            <p className="mt-4 text-lg text-[#9a6e56]">{subtitle}</p>
          </div>

          {children}

          <p className="mt-8 text-center text-base leading-7 text-[#9a6e56]">
            {t("auth.termsAgreement")}{" "}
            <Link href="/terms" className="font-semibold text-primary hover:underline">
              {t("footer.terms")}
            </Link>{" "}
            {t("auth.and")}{" "}
            <Link href="/privacy" className="font-semibold text-primary hover:underline">
              {t("footer.privacy")}
            </Link>
          </p>

          <div className="mt-6 text-center text-base text-[#9a6e56]">
            {footerPrompt}{" "}
            <Link href={footerLinkHref} className="font-semibold text-[#0f957d]">
              {footerLinkLabel}
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link href="/rooms" className="inline-flex items-center gap-2 text-lg font-medium text-[#9a6e56] transition hover:text-[#0f957d]">
              {t("auth.browseListingsFirst")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
