import { Flag, Home as HomeIcon, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";

import { requireAdminUser } from "@/lib/supabase/admin";

type Stats = { users: number; listings: number; removed: number; openReports: number };

async function getStats(): Promise<Stats> {
  try {
    const { supabase } = await requireAdminUser();
    const [users, listings, removed, openReports] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("removed", true),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open")
    ]);

    return {
      users: users.count ?? 0,
      listings: listings.count ?? 0,
      removed: removed.count ?? 0,
      openReports: openReports.count ?? 0
    };
  } catch {
    return { users: 0, listings: 0, removed: 0, openReports: 0 };
  }
}

const statCards = (stats: Stats) => [
  { label: "Total users", value: stats.users, icon: Users, tone: "text-primary" },
  { label: "Active listings", value: stats.listings - stats.removed, icon: HomeIcon, tone: "text-primary" },
  { label: "Removed listings", value: stats.removed, icon: ShieldAlert, tone: "text-destructive" },
  { label: "Open reports", value: stats.openReports, icon: Flag, tone: "text-accent" }
];

const manageCards = [
  { href: "/admin/users", title: "Users", text: "Verify, ban, and review member profiles.", icon: Users },
  { href: "/admin/listings", title: "Listings", text: "Moderate and remove room listings.", icon: HomeIcon },
  { href: "/admin/reports", title: "Reports", text: "Review and resolve user-submitted reports.", icon: Flag }
];

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Admin dashboard</h1>
      <p className="mt-1 text-sm text-foreground/60">Overview of platform activity and moderation.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards(stats).map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <card.icon className={`h-5 w-5 ${card.tone}`} />
            <p className="mt-3 text-2xl font-bold sm:text-3xl">{card.value}</p>
            <p className="mt-1 text-xs text-foreground/55 sm:text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-heading text-lg font-bold">Manage</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {manageCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <card.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-heading text-lg font-bold group-hover:text-primary">{card.title}</h3>
            <p className="mt-1 text-sm text-foreground/60">{card.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
