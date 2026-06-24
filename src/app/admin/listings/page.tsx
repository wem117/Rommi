"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import type { Listing } from "@/types/listing";

export default function AdminListingsPage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const response = await fetch("/api/admin/listings");
      const payload = (await response.json()) as { listings?: Listing[] };
      if (!cancelled) {
        setListings(payload.listings ?? []);
        setLoading(false);
      }
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
    await fetch("/api/admin/listings/action", {
      method: "POST",
      body: JSON.stringify({ listingId, action }),
      headers: { "Content-Type": "application/json" }
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Listings</h1>
      <p className="mt-2 text-foreground/65">Review published room listings and ownership records.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && listings.length === 0 ? <div className="p-4">No listings found.</div> : null}
        {listings.map((listing) => (
          <div key={listing.id} className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="font-semibold">
                {listing.title || "Untitled"}{" "}
                <span className="text-xs text-foreground/50">{listing.city}</span>
              </div>
              <div className="text-sm text-foreground/60">Owner: {listing.ownerId}</div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-red-600 px-3 py-1 text-white" onClick={() => takeAction(listing.id, "remove")}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
