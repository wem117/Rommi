"use client";

import { Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatusBanner } from "@/components/StatusBanner";
import { useAuth } from "@/context/auth-context";
import type { UserProfile } from "@/types/user";

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/admin/users");
    const payload = (await response.json()) as { users?: UserProfile[]; error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Could not load users.");
      setLoading(false);
      return;
    }

    setUsers(payload.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    void load();
  }, [profile]);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (!search) return true;
      return [user.fullName, user.email, user.uid].some(
        (value) => value && String(value).toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search, users]);

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Users</h1>
        <p className="mt-2 text-foreground/65">Sign in to view users.</p>
      </main>
    );
  }

  if (profile.role !== "admin") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Users</h1>
        <p className="mt-2 text-foreground/65">You are not authorized to view this page.</p>
      </main>
    );
  }

  async function toggleBan(userId: string, ban: boolean) {
    setActionLoadingId(userId);
    const response = await fetch("/api/admin/users/ban", {
      method: "POST",
      body: JSON.stringify({ userId, ban }),
      headers: { "Content-Type": "application/json" }
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Could not update user status.");
      setActionLoadingId(null);
      return;
    }

    setUsers((current) => current.map((user) => (user.uid === userId ? { ...user, banned: ban } : user)));
    setActionLoadingId(null);
  }

  async function toggleVerify(userId: string, verify: boolean) {
    setActionLoadingId(userId);
    const response = await fetch("/api/admin/users/verify", {
      method: "POST",
      body: JSON.stringify({ userId, verify }),
      headers: { "Content-Type": "application/json" }
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Could not update verification.");
      setActionLoadingId(null);
      return;
    }

    setUsers((current) =>
      current.map((user) => (user.uid === userId ? { ...user, verified: verify } : user))
    );
    setActionLoadingId(null);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Users</h1>
          <p className="mt-2 text-foreground/65">Search profiles, verify accounts, and flag suspicious users.</p>
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
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users"
          className="w-full rounded-2xl border border-border bg-white px-4 py-3"
        />
      </div>

      <div className="mt-6">
        <StatusBanner tone="error" message={message} actionLabel="Retry" onAction={() => void load()} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && filtered.length === 0 ? <div className="p-4">No users found.</div> : null}
        {filtered.map((user) => (
          <div key={user.uid} className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {user.fullName || "—"}
                {user.verified ? <ShieldCheck className="h-4 w-4 text-primary" /> : null}
                <span className="text-xs text-foreground/50">{user.email || user.uid}</span>
              </div>
              <div className="text-sm text-foreground/60">
                Role: {user.role || "user"} • Verified: {user.verified ? "yes" : "no"} • Banned: {user.banned ? "yes" : "no"}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className={
                  user.banned
                    ? "rounded-full bg-foreground/20 px-4 py-2 text-sm font-semibold"
                    : "rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                }
                onClick={() => void toggleBan(user.uid, !user.banned)}
                disabled={actionLoadingId === user.uid}
              >
                {actionLoadingId === user.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : user.banned ? "Unban" : "Flag"}
              </button>
              <button
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void toggleVerify(user.uid, !user.verified)}
                disabled={actionLoadingId === user.uid}
              >
                {actionLoadingId === user.uid ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.verified ? (
                  "Revoke"
                ) : (
                  "Verify"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
