"use client";

import { UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageMenu } from "@/components/layout/language-menu";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { isActivePath, NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

/**
 * The desktop header.
 *
 * ONE design language, shared with the drawer: pill-shaped controls
 * (`rounded-full`), the `border-border` + `bg-card` surface, and the same
 * `bg-primary/10 text-primary` treatment for the current page. Nothing here
 * mixes glass with solid, or two corner radii, because the two files that used
 * to define this navigation had each drifted into their own.
 *
 * Visual priority, deliberately: Profile is the filled button and Sign out is a
 * quiet link. It was the other way round — Sign out was the single most
 * prominent control on every page, which is a strange thing to push at someone
 * who has just arrived.
 */
export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-2 px-4 sm:h-20 sm:gap-4 sm:px-6 lg:px-8 [&>*]:min-w-0">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                // The current page is announced, not just coloured — a visual
                // highlight alone tells a screen-reader user nothing.
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card xl:px-4 ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/75 hover:bg-surface-muted hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageMenu />
          {user ? (
            <>
              <Link
                href="/profile"
                aria-current={isActivePath(pathname, "/profile") ? "page" : undefined}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <UserCircle className="h-4 w-4" aria-hidden="true" />
                {t("nav.myAccount")}
              </Link>
              {/* Secondary by design. Signing out is a rare, deliberate act; it
                  does not need to outrank the navigation to be findable. */}
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full px-3 py-2.5 text-sm font-medium text-foreground/55 transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
