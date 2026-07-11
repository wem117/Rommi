import { Flag, GraduationCap, Home as HomeIcon, LayoutGrid, ShieldAlert, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAdminUser } from "@/lib/supabase/admin";

type Stats = {
  users: number;
  listings: number;
  removed: number;
  roommates: number;
  universities: number;
  categories: number;
  openReports: number;
};

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  at: string;
};

async function getStats(): Promise<Stats> {
  try {
    const { supabase } = await requireAdminUser();
    const [users, listings, removed, roommates, universities, categories, openReports] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("removed", true),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("onboarding_complete", true)
        .eq("looking_for_apartment", true),
      supabase.from("universities").select("*", { count: "exact", head: true }),
      supabase.from("property_categories").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open")
    ]);

    return {
      users: users.count ?? 0,
      listings: listings.count ?? 0,
      removed: removed.count ?? 0,
      roommates: roommates.count ?? 0,
      universities: universities.count ?? 0,
      categories: categories.count ?? 0,
      openReports: openReports.count ?? 0
    };
  } catch {
    return { users: 0, listings: 0, removed: 0, roommates: 0, universities: 0, categories: 0, openReports: 0 };
  }
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  try {
    const { supabase } = await requireAdminUser();
    const [listings, users, reports] = await Promise.all([
      supabase.from("listings").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("uid, full_name, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("reports").select("id, reason, target_type, created_at").order("created_at", { ascending: false }).limit(5)
    ]);

    const items: ActivityItem[] = [
      ...(listings.data ?? []).map((row) => ({
        id: `listing-${row.id}`,
        label: "New listing",
        detail: row.title || "Untitled listing",
        href: "/admin/listings",
        at: row.created_at
      })),
      ...(users.data ?? []).map((row) => ({
        id: `user-${row.uid}`,
        label: "New user",
        detail: row.full_name || row.uid,
        href: "/admin/users",
        at: row.created_at
      })),
      ...(reports.data ?? []).map((row) => ({
        id: `report-${row.id}`,
        label: "New report",
        detail: `${row.target_type}: ${row.reason}`,
        href: "/admin/reports",
        at: row.created_at
      }))
    ];

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
  } catch {
    return [];
  }
}

const statCards = (stats: Stats) => [
  { label: "Total users", value: stats.users, icon: Users, tone: "text-primary" },
  { label: "Active listings", value: stats.listings - stats.removed, icon: HomeIcon, tone: "text-primary" },
  { label: "Roommates", value: stats.roommates, icon: Sparkles, tone: "text-accent" },
  { label: "Open reports", value: stats.openReports, icon: Flag, tone: "text-destructive" },
  { label: "Universities", value: stats.universities, icon: GraduationCap, tone: "text-primary" },
  { label: "Categories", value: stats.categories, icon: LayoutGrid, tone: "text-primary" },
  { label: "Removed listings", value: stats.removed, icon: ShieldAlert, tone: "text-destructive" }
];

const manageCards = [
  { href: "/admin/users", title: "Users", text: "Verify, ban, and review member profiles.", icon: Users },
  { href: "/admin/listings", title: "Listings", text: "Moderate, feature, and edit room listings.", icon: HomeIcon },
  { href: "/admin/roommates", title: "Roommates", text: "Moderate and feature roommate profiles.", icon: Sparkles },
  { href: "/admin/reports", title: "Reports", text: "Review and resolve user-submitted reports.", icon: Flag },
  { href: "/admin/universities", title: "Universities", text: "Manage the university directory.", icon: GraduationCap },
  { href: "/admin/categories", title: "Categories", text: "Manage the property category taxonomy.", icon: LayoutGrid }
];

export default async function AdminPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()]);

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

      <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-heading text-lg font-bold">Manage</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
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
        </div>

        <div>
          <h2 className="font-heading text-lg font-bold">Recent activity</h2>
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
            {activity.length === 0 ? (
              <p className="text-sm text-foreground/50">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="block rounded-xl px-2 py-1.5 transition hover:bg-muted">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{item.label}</Badge>
                        <span className="text-[11px] text-foreground/40">{new Date(item.at).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-foreground/70">{item.detail}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
