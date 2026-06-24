import Link from "next/link";

const cards = [
  { href: "/admin/users", title: "Users", text: "Review profiles and account status." },
  { href: "/admin/listings", title: "Listings", text: "Review room listings and owner data." },
  { href: "/admin/reports", title: "Reports", text: "Track user-submitted moderation reports." }
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Admin dashboard</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="font-heading text-xl font-bold">{card.title}</h2>
            <p className="mt-2 text-sm text-foreground/60">{card.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
