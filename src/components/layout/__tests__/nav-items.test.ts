import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ACCOUNT_ITEMS, isActivePath, NAV_ITEMS } from "@/components/layout/nav-items";

const SRC = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");

describe("navigation items", () => {
  it("gives every item an icon", () => {
    // The rule the old drawer broke: it iconed "My listings" and "Profile" and
    // left the four above them bare, so one list read as two.
    for (const item of [...NAV_ITEMS, ...ACCOUNT_ITEMS]) {
      expect(item.icon, `${item.href} has no icon`).toBeTruthy();
    }
  });

  it("includes Universities", () => {
    // It existed in the mobile drawer and nowhere on desktop, because the two
    // navigations were written out separately.
    expect(NAV_ITEMS.map((item) => item.href)).toContain("/universities");
  });

  it("keeps My listings out of the primary navigation", () => {
    expect(NAV_ITEMS.map((item) => item.href)).not.toContain("/my-listings");
    expect(ACCOUNT_ITEMS.map((item) => item.href)).toContain("/my-listings");
  });

  it("has no duplicate destinations", () => {
    const hrefs = [...NAV_ITEMS, ...ACCOUNT_ITEMS].map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("isActivePath", () => {
  it("matches the exact page", () => {
    expect(isActivePath("/rooms", "/rooms")).toBe(true);
  });

  it("keeps a parent lit on a nested route", () => {
    expect(isActivePath("/rooms/abc123", "/rooms")).toBe(true);
  });

  it("does not match a merely similar prefix", () => {
    expect(isActivePath("/roommates", "/rooms")).toBe(false);
  });

  it("only matches home on home", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/rooms", "/")).toBe(false);
  });

  it("tolerates a null pathname during hydration", () => {
    expect(isActivePath(null, "/rooms")).toBe(false);
  });
});

/**
 * Both navigations are built from the same list, so they cannot disagree about
 * which pages exist. These read the source rather than rendering, because the
 * property under test is structural: that neither file hardcodes its own list.
 */
describe("the two navigations share one definition", () => {
  it("both build from NAV_ITEMS", () => {
    for (const file of ["components/layout/navbar.tsx", "components/layout/mobile-nav.tsx"]) {
      expect(read(file)).toContain("NAV_ITEMS");
    }
  });

  it("both mark the current page for assistive technology", () => {
    for (const file of ["components/layout/navbar.tsx", "components/layout/mobile-nav.tsx"]) {
      expect(read(file), `${file} never sets aria-current`).toContain("aria-current");
    }
  });

  it("both render the shared logo rather than their own", () => {
    for (const file of ["components/layout/navbar.tsx", "components/layout/mobile-nav.tsx"]) {
      const source = read(file);
      expect(source).toContain("<Logo");
      // The drawer used to spell out its own wordmark, so opening the menu
      // swapped the brand for a different one.
      expect(source).not.toMatch(/Room<span/);
    }
  });

  it("keeps Sign out quieter than the primary action", () => {
    // Sign out was `bg-primary` — the loudest control on every page, pushed at
    // someone who had just arrived. Profile is the filled button now.
    //
    // The window is bounded to the sign-out control's own className; reading to
    // the end of the file catches the SIGN-IN link below it, which is
    // legitimately primary.
    for (const file of ["components/layout/navbar.tsx", "components/layout/mobile-nav.tsx"]) {
      const source = read(file);
      const start = source.indexOf("signOut()");
      expect(start, `${file} never calls signOut`).toBeGreaterThan(-1);
      const control = source.slice(start, start + 400);
      expect(control, `${file}: sign out is styled as a primary button`).not.toMatch(/bg-primary[\s"]/);
    }
  });

  it("makes Profile the primary action instead", () => {
    const navbar = read("components/layout/navbar.tsx");
    const profileLink = navbar.slice(navbar.indexOf('href="/profile"'));
    expect(profileLink.slice(0, 400)).toMatch(/bg-primary[\s"]/);
  });
});
