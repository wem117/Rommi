"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AdminListingsPage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "listings"));
      if (cancelled) return;
      setListings(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Listings</h1>
        <p className="mt-2 text-foreground/65">Sign in to view listings.</p>
      </main>
    );
  }

  if (profile.role !== "admin") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Listings</h1>
        <p className="mt-2 text-foreground/65">You are not authorized to view this page.</p>
      </main>
    );
  }

  async function takeAction(listingId: string, action: "remove" | "restore") {
    await fetch('/api/admin/listings/action', { method: 'POST', body: JSON.stringify({ listingId, action }), headers: { 'Content-Type': 'application/json' } });
    setListings((s) => s.map((l) => (l.id === listingId ? { ...l, removed: action === 'remove' } : l)));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Listings</h1>
      <p className="mt-2 text-foreground/65">Review published room listings and ownership records.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && listings.length === 0 ? <div className="p-4">No listings found.</div> : null}
        {listings.map((l) => (
          <div key={l.id} className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="font-semibold">{l.title || "Untitled"} <span className="text-xs text-foreground/50">{l.city}</span></div>
              <div className="text-sm text-foreground/60">Owner: {l.ownerId}</div>
            </div>
            <div className="flex gap-2">
              {l.removed ? (
                <button className="rounded-md bg-emerald-600 px-3 py-1 text-white" onClick={() => takeAction(l.id, 'restore')}>Restore</button>
              ) : (
                <button className="rounded-md bg-red-600 px-3 py-1 text-white" onClick={() => takeAction(l.id, 'remove')}>Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
