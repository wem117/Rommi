"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import type { UserProfile } from "@/types/user";

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      const payload = (await response.json()) as { users?: UserProfile[] };
      if (!cancelled) {
        setUsers(payload.users ?? []);
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

  const filtered = users.filter((user) => {
    if (!search) return true;
    return [user.fullName, user.email, user.uid].some(
      (value) => value && String(value).toLowerCase().includes(search.toLowerCase())
    );
  });

  async function toggleBan(userId: string, ban: boolean) {
    await fetch("/api/admin/users/ban", {
      method: "POST",
      body: JSON.stringify({ userId, ban }),
      headers: { "Content-Type": "application/json" }
    });
  }

  async function toggleVerify(userId: string, verify: boolean) {
    await fetch("/api/admin/users/verify", {
      method: "POST",
      body: JSON.stringify({ userId, verify }),
      headers: { "Content-Type": "application/json" }
    });
    setUsers((current) =>
      current.map((user) => (user.uid === userId ? { ...user, verified: verify } : user))
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Users</h1>
      <p className="mt-2 text-foreground/65">Search and moderate user accounts.</p>

      <div className="mt-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users"
          className="w-full rounded-md border border-border px-3 py-2"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && filtered.length === 0 ? <div className="p-4">No users found.</div> : null}
        {filtered.map((user) => (
          <div key={user.uid} className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="font-semibold">
                {user.fullName || "—"}{" "}
                <span className="text-xs text-foreground/50">{user.email || user.uid}</span>
              </div>
              <div className="text-sm text-foreground/60">
                Role: {user.role || "user"} • Verified: {user.verified ? "yes" : "no"}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-red-600 px-3 py-1 text-white" onClick={() => toggleBan(user.uid, true)}>
                Flag
              </button>
              <button
                className="rounded-md bg-emerald-600 px-3 py-1 text-white"
                onClick={() => toggleVerify(user.uid, !user.verified)}
              >
                {user.verified ? "Revoke" : "Verify"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
