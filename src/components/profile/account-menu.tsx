"use client";

import { Building2, ChevronRight, Heart, LogOut, Settings, UserCog } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

/**
 * The account menu: everything that belongs to the signed-in person, in one
 * place under Profile.
 *
 * "My listings" used to sit in the top navigation bar, beside Rooms and
 * Roommates. Those are places anyone can browse; a private, auth-gated page is
 * not the same kind of thing, and putting it there made the bar longer in every
 * language while leaving the account itself with no menu at all.
 *
 * Logout is here because this is where someone looks for it, and it is styled
 * as the quiet row at the bottom rather than a button competing with the
 * navigation above it — the same priority the header now uses.
 */
export function AccountMenu() {
  const { signOut } = useAuth();
  const { t } = useLocale();

  const items = [
    { href: "/profile/edit", label: t("account.personalInformation"), icon: UserCog },
    { href: "/my-listings", label: t("nav.myListings"), icon: Building2 },
    { href: "/favorites", label: t("account.savedListings"), icon: Heart },
    { href: "/profile/edit#preferences", label: t("account.settings"), icon: Settings }
  ];

  return (
    <nav aria-label={t("account.title")} className="rounded-2xl border border-border bg-card p-2 shadow-soft">
      <ul>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/85 transition hover:bg-surface-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon className="h-4 w-4 shrink-0 text-foreground/50" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" aria-hidden="true" />
              </Link>
            </li>
          );
        })}

        <li className="mt-1 border-t border-border pt-1">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/55 transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("nav.signOut")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
