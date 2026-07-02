"use client";

import { Eye, EyeOff, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import type { Listing } from "@/types/listing";

type AdminListing = Listing & {
  removed?: boolean;
};

export default function AdminListingsPage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/admin/listings");
    const payload = (await response.json()) as { listings?: AdminListing[]; error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Could not load listings.");
      setLoading(false);
      return;
    }

    setListings(payload.listings ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    void load();
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
    setActionLoadingId(listingId);

    const response = await fetch("/api/admin/listings/action", {
      method: "POST",
      body: JSON.stringify({ listingId, action }),
      headers: { "Content-Type": "application/json" }
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Could not update listing visibility.");
      setActionLoadingId(null);
      return;
    }

    setListings((current) =>
      current.map((listing) => (listing.id === listingId ? { ...listing, removed: action === "remove" } : listing))
    );
    setActionLoadingId(null);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Listings</h1>
          <p className="mt-2 text-foreground/65">Review room listings and toggle their visibility.</p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-full border border-[#e7dccf] bg-white px-5 py-3 text-sm font-semibold"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mt-6">
        <StatusBanner tone="error" message={message} actionLabel="Retry" onAction={() => void load()} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && listings.length === 0 ? <div className="p-4">No listings found.</div> : null}
        {listings.map((listing) => (
          <div key={listing.id} className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">
                {listing.title || "Untitled"}{" "}
                <span className="text-xs text-foreground/50">{listing.city}</span>
              </div>
              <div className="text-sm text-foreground/60">Owner: {listing.ownerId}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a6e56]">
                {listing.removed ? "Hidden" : "Visible"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[#f7f1e7] px-4 py-2 text-sm font-semibold text-foreground"
                onClick={() => void takeAction(listing.id, listing.removed ? "restore" : "remove")}
                disabled={actionLoadingId === listing.id}
              >
                {actionLoadingId === listing.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : listing.removed ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {listing.removed ? "Restore" : "Hide"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
