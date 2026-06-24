import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="font-heading text-2xl font-bold text-primary">
            Roommate KZ
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/60">
            Student rooms and roommate matching for Kazakhstan.
          </p>
        </div>
        <div>
          <h3 className="font-heading font-bold">Platform</h3>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            <Link href="/rooms">Rooms</Link>
            <Link href="/roommates">Roommates</Link>
            <Link href="/universities">Universities</Link>
          </div>
        </div>
        <div>
          <h3 className="font-heading font-bold">Company</h3>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            <Link href="/">About</Link>
            <Link href="/">Careers</Link>
          </div>
        </div>
        <div>
          <h3 className="font-heading font-bold">Support</h3>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            <Link href="/">Help</Link>
            <Link href="/">Safety</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-foreground/50">
        © 2026 Roommate KZ. All rights reserved.
      </div>
    </footer>
  );
}
