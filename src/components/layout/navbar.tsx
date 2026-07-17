"use client";

import { Home, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";

import { LanguageMenu } from "@/components/layout/language-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-2 px-4 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-foreground sm:gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground sm:h-12 sm:w-12">
            <Home className="h-5 w-5" />
          </span>
          <span className="text-2xl font-bold leading-none sm:text-[2rem]">
            Room<span className="text-primary">i</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-12 text-[1.05rem] font-medium text-foreground/80 md:flex">
          {[
            { href: "/rooms", label: t("nav.rooms") },
            { href: "/roommates", label: t("nav.roommates") },
            { href: "/list-a-room/step-1", label: t("nav.listRoom") }
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative transition hover:text-primary after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex sm:gap-3">
          <LanguageMenu />
          {user ? (
            <>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary sm:px-4"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.myAccount")}</span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95 sm:px-5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.signOut")}</span>
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95 sm:px-6"
            >
              {loading ? t("nav.loading") : t("nav.signIn")}
            </Link>
          )}
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
