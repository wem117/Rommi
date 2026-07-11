import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/supabase/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/sign-in?redirect=/admin");
    }

    redirect("/rooms");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin" className="font-heading text-2xl font-bold text-primary">
            Roomi Admin
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm font-semibold text-foreground/65">
            <Link href="/admin/users" className="transition hover:text-primary">Users</Link>
            <Link href="/admin/listings" className="transition hover:text-primary">Listings</Link>
            <Link href="/admin/reports" className="transition hover:text-primary">Reports</Link>
            <Link href="/admin/testimonials" className="transition hover:text-primary">Testimonials</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
