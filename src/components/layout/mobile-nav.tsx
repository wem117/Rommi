"use client";

import { ClipboardList, LogOut, Menu, UserCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageMenu } from "@/components/layout/language-menu";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

const NAV_LINKS = [
  { href: "/rooms", key: "nav.rooms" },
  { href: "/roommates", key: "nav.roommates" },
  { href: "/universities", key: "nav.universities" },
  { href: "/list-a-room/step-1", key: "nav.listRoom" },
] as const;

/**
 * Airbnb-style mobile navigation: a hamburger trigger that opens a slide-in
 * drawer. Reuses the shared LanguageMenu, useAuth, and useLocale — no navbar
 * logic is duplicated. Rendered below `lg`: at the `md` range the three nav
 * links plus the language menu and auth buttons could not fit on one row in
 * Kazakh, which pushed the header past the viewport and scrolled every page
 * sideways on tablets.
 *
 * The overlay is rendered through a portal to <body>: the sticky header uses
 * backdrop-blur, and `backdrop-filter` makes an element the containing block
 * for position:fixed descendants — an overlay rendered inline would be
 * positioned/clipped relative to the header and page content would bleed
 * through underneath it.
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

  const overlay = (
    <div
      className={`fixed inset-0 z-[70] lg:hidden ${open ? "" : "pointer-events-none"}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t("nav.closeMenu")}
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 h-full w-full bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] transform flex-col bg-card shadow-2xl transition-transform duration-300 ease-out [padding-right:env(safe-area-inset-right)] [padding-top:env(safe-area-inset-top)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-lg font-bold">
            Room<span className="text-primary">i</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
            tabIndex={open ? 0 : -1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:border-primary hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              className="rounded-2xl px-4 py-3 text-base font-semibold text-foreground/90 transition hover:bg-surface-muted hover:text-primary"
            >
              {t(link.key)}
            </Link>
          ))}

          {user ? (
            <Link
              href="/my-listings"
              tabIndex={open ? 0 : -1}
              className="mt-1 inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-foreground/90 transition hover:bg-surface-muted hover:text-primary"
            >
              <ClipboardList className="h-5 w-5" />
              {t("nav.myListings")}
            </Link>
          ) : null}

          {user ? (
            <Link
              href="/profile"
              tabIndex={open ? 0 : -1}
              className="mt-1 inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-foreground/90 transition hover:bg-surface-muted hover:text-primary"
            >
              <UserCircle className="h-5 w-5" />
              {t("nav.myAccount")}
            </Link>
          ) : null}
        </nav>

        <div className="border-t border-border px-5 py-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-4">
            <LanguageMenu direction="up" />
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              tabIndex={open ? 0 : -1}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.signOut")}
            </button>
          ) : (
            <Link
              href="/sign-in"
              tabIndex={open ? 0 : -1}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
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
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:border-primary hover:text-primary"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted ? createPortal(overlay, document.body) : null}
    </div>
  );
}
