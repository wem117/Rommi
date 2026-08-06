"use client";

import { LogOut, Menu, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageMenu } from "@/components/layout/language-menu";
import { Logo } from "@/components/layout/logo";
import { isActivePath, NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

/**
 * The mobile navigation drawer.
 *
 * Renders the SAME items as the desktop header, from the same list
 * (nav-items.ts) — the two used to be written out separately, which is how
 * Universities came to exist in one and not the other.
 *
 * The overlay is rendered through a portal to <body>: the sticky header uses
 * backdrop-blur, and `backdrop-filter` makes an element the containing block
 * for position:fixed descendants — an overlay rendered inline would be
 * positioned and clipped relative to the header, and page content would show
 * through underneath it.
 *
 * ISOLATION. The panel is fully opaque (`bg-card`, no transparency) and the
 * scrim behind it is heavy enough to actually suppress the page rather than
 * tint it. The previous scrim was `bg-black/40 backdrop-blur-sm`, through which
 * search fields and cards stayed legible — an open menu drawn on top of a page
 * that is still competing for attention. `isolate` gives the whole overlay its
 * own stacking context so nothing on the page can interleave with it, and z-80
 * puts it above every dialog (z-50) and dropdown (z-40) in the app.
 */
export function MobileNav() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the drawer whenever the route changes (link tap navigates).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const linkClass = (active: boolean) =>
    `inline-flex items-center gap-3 rounded-full px-4 py-3 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-surface-muted hover:text-primary"
    }`;

  const overlay = (
    <div
      className={`fixed inset-0 isolate z-[80] lg:hidden ${open ? "" : "pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-label={t("nav.menu")}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t("nav.closeMenu")}
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 h-full w-full bg-foreground/70 backdrop-blur-md transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] transform flex-col bg-card shadow-2xl transition-transform duration-300 ease-out [padding-right:env(safe-area-inset-right)] [padding-top:env(safe-area-inset-top)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
            tabIndex={open ? 0 : -1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={open ? 0 : -1}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t(item.key)}
              </Link>
            );
          })}

          {/* Profile is the account entry point; My listings and Saved listings
              live inside it rather than competing with the main navigation. */}
          {user ? (
            <Link
              href="/profile"
              tabIndex={open ? 0 : -1}
              aria-current={isActivePath(pathname, "/profile") ? "page" : undefined}
              className={`mt-2 border-t border-border pt-4 ${linkClass(isActivePath(pathname, "/profile"))}`}
            >
              <UserCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t("nav.myAccount")}
            </Link>
          ) : null}
        </nav>

        <div className="border-t border-border px-5 py-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-3">
            <LanguageMenu direction="up" />
          </div>

          {user ? (
            /* Quiet, like its desktop counterpart. This was the loudest control
               in the drawer — a filled primary button below the navigation. */
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              tabIndex={open ? 0 : -1}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground/60 transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("nav.signOut")}
            </button>
          ) : (
            <Link
              href="/sign-in"
              tabIndex={open ? 0 : -1}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {loading ? t("nav.loading") : t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("nav.menu")}
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {mounted ? createPortal(overlay, document.body) : null}
    </div>
  );
}
