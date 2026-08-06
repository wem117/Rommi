import { Building2, GraduationCap, PlusSquare, Search, Users, type LucideIcon } from "lucide-react";

/**
 * The site navigation, defined once.
 *
 * It used to be defined twice — a list in `navbar.tsx` and a different list in
 * `mobile-nav.tsx` — which is why Universities appeared in the mobile drawer
 * and nowhere on desktop. Two lists that are supposed to agree will not, and
 * the failure is silent because nobody sees both at the same viewport.
 *
 * EVERY item carries an icon. That is a rule, not a preference: the previous
 * drawer gave icons to "My listings" and "Profile" and none to the four items
 * above them, so the list read as two unrelated groups that happened to share a
 * container. Either all or none — and all, because the drawer needs the scan
 * targets.
 */
export interface NavItem {
  href: string;
  /** i18n key, resolved by the caller so this module stays locale-agnostic. */
  key: string;
  icon: LucideIcon;
  /** Signed-in only. The page is auth-gated; advertising it to a guest bounces them. */
  authOnly?: boolean;
}

/**
 * The primary navigation.
 *
 * "My listings" is deliberately NOT here. It moved under Profile, where a
 * personal, signed-in-only page belongs — the top bar is for the four
 * destinations any visitor might want, and mixing an account page into it made
 * the bar longer in every language while burying the account menu.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/rooms", key: "nav.rooms", icon: Search },
  { href: "/roommates", key: "nav.roommates", icon: Users },
  { href: "/universities", key: "nav.universities", icon: GraduationCap },
  { href: "/list-a-room/step-1", key: "nav.listRoom", icon: PlusSquare }
] as const;

/**
 * Everything under Profile, in the order the account menu shows them.
 *
 * Logout is not in this list — it is an action, not a destination, and giving
 * it a row here would put it back among the navigation it should sit apart
 * from.
 */
export const ACCOUNT_ITEMS: readonly NavItem[] = [
  { href: "/profile/edit", key: "account.personalInformation", icon: Users },
  { href: "/my-listings", key: "nav.myListings", icon: Building2 },
  { href: "/favorites", key: "account.savedListings", icon: Search }
] as const;

/**
 * Whether `href` is the page currently being shown.
 *
 * Prefix-matching so a nested route still lights its parent —
 * `/rooms/abc123` highlights Rooms — while "/" only ever matches itself, since
 * every path starts with it.
 */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
