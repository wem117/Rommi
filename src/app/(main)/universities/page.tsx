import Link from "next/link";

import { UNIVERSITIES } from "@/lib/constants/universities";

export default function UniversitiesPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Universities</h1>
      <p className="mt-2 max-w-2xl text-foreground/65">
        Find roommates and rooms around Kazakhstan's major student communities.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {UNIVERSITIES.map((university) => (
          <article key={university} className="rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="font-heading text-xl font-bold">{university}</h2>
            <p className="mt-2 text-sm text-foreground/60">Browse listings and students connected to this campus.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/rooms?university=${encodeURIComponent(university)}`} className="font-semibold text-primary">
                Rooms
              </Link>
              <Link href={`/roommates?university=${encodeURIComponent(university)}`} className="font-semibold text-primary">
                Roommates
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
