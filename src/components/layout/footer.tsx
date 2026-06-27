import Link from "next/link";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    label: "Telegram",
    href: "https://t.me",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 4 3 11.3l6.7 2.4L18 7l-6 7 5 3L21 4Z" />
      </svg>
    )
  },
  {
    label: "WhatsApp",
    href: "https://wa.me",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 11.6A8.4 8.4 0 0 1 7.2 18.9L4 20l1.2-3A8.4 8.4 0 1 1 20 11.6Z" />
        <path d="M9.4 8.8c.2-.4.5-.4.7-.4h.6c.2 0 .4 0 .5.3l.8 1.8c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.2-.1.4.3.5.8 1 1.3 1.4.5.3 1 .6 1.6.8.1.1.2 0 .4-.1l.7-.8c.1-.2.4-.2.5-.1l1.7.8c.2.1.3.3.3.5v.5c0 .3-.1.6-.4.7-.5.3-1.1.4-1.7.3-1.1-.2-2.1-.7-3.1-1.3a9 9 0 0 1-2.4-2.4c-.6-.9-1.1-2-1.3-3-.1-.6 0-1.2.3-1.8Z" />
      </svg>
    )
  }
];

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

          <div className="mt-5 flex flex-wrap gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#e7dccf] bg-[#fffaf4] px-4 py-2 text-sm font-semibold text-foreground/70 transition hover:border-primary hover:text-primary"
              >
                {social.icon}
                {social.label}
              </a>
            ))}
          </div>
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
