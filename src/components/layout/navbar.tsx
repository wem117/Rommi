"use client";

import { LogOut, Plus, UserCircle } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

export function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-heading text-2xl font-bold text-primary">
          Roommate KZ
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 md:flex">
          <Link href="/rooms" className="hover:text-primary">
            Rooms
          </Link>
          <Link href="/roommates" className="hover:text-primary">
            Roommates
          </Link>
          <Link href="/universities" className="hover:text-primary">
            Universities
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <select
            aria-label="Language"
            value={locale}
            onChange={(event) => setLocale(event.target.value as "en" | "ru")}
            className="w-auto rounded-full border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="en">EN</option>
            <option value="ru">RU</option>
          </select>
          {user ? (
            <>
              <Link
                href="/list-a-room/step-1"
                className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white sm:inline-flex"
              >
                <Plus className="h-4 w-4" />
                List a room
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-semibold"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{profile?.fullName ?? user.email ?? "Profile"}</span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-border p-2 text-foreground/70"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Loading" : "Sign In"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
