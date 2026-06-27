"use client";

import { Home, LogOut, UserCircle } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";

export function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const { locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-30 border-b border-[#eadfce] bg-[#fffdf9]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-[#16110f]">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0c8f7a] text-white">
            <Home className="h-5 w-5" />
          </span>
          <span className="text-[2rem] font-bold leading-none">
            Roommate <span className="text-[#0c8f7a]">KZ</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-12 text-[1.05rem] font-medium text-[#2e2622] md:flex">
          <Link href="/rooms" className="transition hover:text-[#12b000]">
            Rooms
          </Link>
          <Link href="/roommates" className="transition hover:text-[#12b000]">
            Roommates
          </Link>
          <Link href="/list-a-room/step-1" className="transition hover:text-[#12b000]">
            List a Room
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <select
            aria-label="Language"
            value={locale}
            onChange={(event) => setLocale(event.target.value as "en" | "ru")}
            className="w-auto rounded-full border border-[#e6d8c6] bg-white px-4 py-2.5 text-sm font-medium text-[#2e2622] shadow-sm"
          >
            <option value="en">EN</option>
            <option value="ru">KZ</option>
          </select>

          {user ? (
            <>
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-full border border-[#e6d8c6] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e2622] shadow-sm transition hover:border-[#12b000] hover:text-[#12b000] sm:inline-flex"
              >
                <UserCircle className="h-4 w-4" />
                {profile?.fullName ?? user.email ?? "Profile"}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 rounded-full bg-[#12b000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#109900]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-[#12b000] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#109900]"
            >
              {loading ? "Loading" : "Sign In"}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
