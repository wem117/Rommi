"use client";

import { Loader2, ShieldX, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Report } from "@/types/report";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const json = (await res.json()) as { reports?: Report[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load reports.");
      setReports(json.reports ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateReport(reportId: string, status: "resolved" | "dismissed") {
    setBusyId(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status })
      });
      if (!res.ok) throw new Error("Update failed");
      setReports((current) => current.map((report) => (report.id === reportId ? { ...report, status } : report)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeContent(reportId: string) {
    setBusyId(reportId);
    try {
      const res = await fetch("/api/reports/remove-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId })
      });
      if (!res.ok) throw new Error("Could not remove content");
      toast.success("Reported content removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove content");
    } finally {
      setBusyId(null);
      setPendingRemoveId(null);
    }
  }

  async function deleteReport(reportId: string) {
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Report deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Reports</h1>
      <p className="mt-1 text-sm text-foreground/60">Review user-submitted moderation reports and take action.</p>

      <div className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">No reports found.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold capitalize">{report.targetType}</span>
                      <span className="text-xs text-foreground/50">{report.targetId}</span>
                      <Badge
                        variant={
                          report.status === "resolved"
                            ? "success"
                            : report.status === "dismissed"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground/70">
                      {report.reason}
                      {report.details ? ` — ${report.details}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-foreground/45">Reporter: {report.reporterId}</p>
                    {report.adminNote ? <p className="mt-1 text-xs italic text-foreground/50">Note: {report.adminNote}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {report.status === "open" ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => updateReport(report.id, "resolved")}>
                          Resolve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => updateReport(report.id, "dismissed")}>
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          disabled={busyId === report.id}
                          onClick={() => setPendingRemoveId(report.id)}
                        >
                          <ShieldX className="h-4 w-4" />
                          Remove content
                        </Button>
                      </>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete report"
                      className="hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPendingDeleteId(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={Boolean(pendingRemoveId)} onOpenChange={(open) => !open && setPendingRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove reported content?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the reported listing or bans the reported user, and marks the report resolved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingRemoveId && removeContent(pendingRemoveId)}
            >
              Remove content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDeleteId && deleteReport(pendingDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
