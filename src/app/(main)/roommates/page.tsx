"use client";

import { RoommateCard } from "@/components/roommates/roommate-card";
import { useAuth } from "@/context/auth-context";
import { useRoommates } from "@/hooks/use-roommates";

export default function RoommatesPage() {
  const { profile } = useAuth();
  const { roommates, loading, error } = useRoommates();

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Roommates</h1>
      <p className="mt-2 text-foreground/65">Browse students with completed roommate profiles.</p>

      {loading ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">Loading roommates...</div> : null}
      {error ? <div className="mt-8 rounded-2xl bg-white p-8 shadow-soft">{error}</div> : null}
      {!loading && !error && roommates.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roommates.map((roommate) => (
            <RoommateCard key={roommate.uid} profile={roommate} currentUser={profile} />
          ))}
        </div>
      ) : null}
      {!loading && !error && !roommates.length ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-soft">No roommate profiles yet.</div>
      ) : null}
    </main>
  );
}
