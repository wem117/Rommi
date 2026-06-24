"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function AdminReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const snapshot = await getDocs(query(collection(db, "reports")));
      if (cancelled) return;
      setReports(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
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
        <h1 className="text-4xl font-bold">Reports</h1>
        <p className="mt-2 text-foreground/65">Sign in to view reports.</p>
      </main>
    );
  }

  if (profile.role !== "admin") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">Reports</h1>
        <p className="mt-2 text-foreground/65">You are not authorized to view this page.</p>
      </main>
    );
  }

  async function updateReport(reportId: string, status: string) {
    await fetch('/api/reports', { method: 'PATCH', body: JSON.stringify({ reportId, status }), headers: { 'Content-Type': 'application/json' } });
    setReports((s) => s.map((r) => (r.id === reportId ? { ...r, status } : r)));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Reports</h1>
      <p className="mt-2 text-foreground/65">Review user-submitted moderation reports.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && reports.length === 0 ? <div className="p-4">No reports found.</div> : null}
        {reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="font-semibold">{r.targetType} • {r.targetId}</div>
              <div className="text-sm text-foreground/60">{r.reason} — {r.details}</div>
              <div className="text-xs text-foreground/50">Reporter: {r.reporterId} • Status: {r.status}</div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-emerald-600 px-3 py-1 text-white" onClick={() => updateReport(r.id, 'action_taken')}>Action Taken</button>
              <button className="rounded-md bg-yellow-500 px-3 py-1 text-white" onClick={() => updateReport(r.id, 'dismissed')}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
