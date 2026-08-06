import { Home } from "lucide-react";
import Link from "next/link";

/**
 * The Roomi logo, in one place.
 *
 * The header rendered a mark-plus-wordmark and the mobile drawer rendered the
 * wordmark alone, so opening the menu swapped the brand for a different one.
 * Same lockup everywhere now; only the scale changes.
 */
export function Logo({
  size = "md",
  className = ""
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const mark = size === "sm" ? "h-8 w-8" : "h-10 w-10 sm:h-12 sm:w-12";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const word = size === "sm" ? "text-xl" : "text-2xl sm:text-[2rem]";

  return (
    <Link
      href="/"
      aria-label="Roomi — home"
      className={`inline-flex items-center gap-2 text-foreground transition hover:opacity-90 sm:gap-3 ${className}`}
    >
      <span className={`grid ${mark} shrink-0 place-items-center rounded-full bg-primary text-primary-foreground`}>
        <Home className={icon} aria-hidden="true" />
      </span>
      <span className={`${word} font-bold leading-none`}>
        Room<span className="text-primary">i</span>
      </span>
    </Link>
  );
}
