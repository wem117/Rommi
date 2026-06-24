"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import type { Report } from "@/types/report";

export default function AdminReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const response = await fetch("/api/reports");
      const payload = (await response.json()) as { reports?: Report[] };
      if (!cancelled) {
        setReports(payload.reports ?? []);
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

  async function updateReport(reportId: string, status: "resolved" | "dismissed") {
    await fetch("/api/reports", {
      method: "PATCH",
      body: JSON.stringify({ reportId, status }),
      headers: { "Content-Type": "application/json" }
    });
    setReports((current) => current.map((report) => (report.id === reportId ? { ...report, status } : report)));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">Reports</h1>
      <p className="mt-2 text-foreground/65">Review user-submitted moderation reports.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        {loading ? <div className="p-4">Loading...</div> : null}
        {!loading && reports.length === 0 ? <div className="p-4">No reports found.</div> : null}
        {reports.map((report) => (
          <div key={report.id} className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="font-semibold">
                {report.targetType} • {report.targetId}
              </div>
              <div className="text-sm text-foreground/60">
                {report.reason} — {report.details}
              </div>
              <div className="text-xs text-foreground/50">
                Reporter: {report.reporterId} • Status: {report.status}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md bg-emerald-600 px-3 py-1 text-white" onClick={() => updateReport(report.id, "resolved")}>
                Resolve
              </button>
              <button className="rounded-md bg-yellow-500 px-3 py-1 text-white" onClick={() => updateReport(report.id, "dismissed")}>
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
