"use client";

import { History, Loader2, MoreVertical, NotebookPen, ShieldAlert, ShieldBan, ShieldX, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import type { Report } from "@/types/report";

type ModerationAction = "remove_content" | "warn" | "suspend" | "ban";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTargetId, setPendingDeleteTargetId] = useState<Report | null>(null);
  const [pendingAction, setPendingAction] = useState<{ report: Report; action: ModerationAction } | null>(null);
  const [historyReport, setHistoryReport] = useState<Report | null>(null);
  const [noteReport, setNoteReport] = useState<Report | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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

  async function updateReport(reportId: string, status: "resolved" | "dismissed", note?: string) {
    setBusyId(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status, note })
      });
      if (!res.ok) throw new Error("Update failed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function runModeration(report: Report, action: ModerationAction) {
    setBusyId(report.id);
    try {
      const res = await fetch("/api/reports/remove-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, action })
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(
        action === "warn"
          ? "Warning recorded"
          : action === "suspend"
            ? "User suspended"
            : action === "ban"
              ? "User banned"
              : "Listing removed"
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  async function deleteTarget(report: Report) {
    try {
      const endpoint = report.targetType === "listing" ? `/api/admin/listings/${report.targetId}` : `/api/admin/users/${report.targetId}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(report.targetType === "listing" ? "Listing deleted" : "Roommate deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteTargetId(null);
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

  async function saveNote() {
    if (!noteReport) return;
    setSavingNote(true);
    try {
      await updateReport(noteReport.id, noteReport.status === "dismissed" ? "dismissed" : "resolved", noteDraft);
      setNoteReport(null);
    } finally {
      setSavingNote(false);
    }
  }

  const history = historyReport
    ? reports.filter((r) => r.targetId === historyReport.targetId && r.targetType === historyReport.targetType)
    : [];

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
                      </>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More actions">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {report.targetType === "listing" ? (
                          <DropdownMenuItem onClick={() => setPendingAction({ report, action: "remove_content" })}>
                            <ShieldX className="mr-2 h-4 w-4" />
                            Remove listing
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => setPendingAction({ report, action: "warn" })}>
                              <ShieldAlert className="mr-2 h-4 w-4" />
                              Warn user
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPendingAction({ report, action: "suspend" })}>
                              <ShieldBan className="mr-2 h-4 w-4" />
                              Suspend user
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPendingAction({ report, action: "ban" })}>
                              <ShieldX className="mr-2 h-4 w-4" />
                              Ban user
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setNoteReport(report);
                            setNoteDraft(report.adminNote ?? "");
                          }}
                        >
                          <NotebookPen className="mr-2 h-4 w-4" />
                          Add note
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryReport(report)}>
                          <History className="mr-2 h-4 w-4" />
                          View history
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setPendingDeleteTargetId(report)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete {report.targetType}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "warn"
                ? "Warn this user?"
                : pendingAction?.action === "suspend"
                  ? "Suspend this user?"
                  : pendingAction?.action === "ban"
                    ? "Ban this user?"
                    : "Remove this listing?"}
            </AlertDialogTitle>
            <AlertDialogDescription>This marks the report resolved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingAction && runModeration(pendingAction.report, pendingAction.action)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingDeleteTargetId)} onOpenChange={(open) => !open && setPendingDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this {pendingDeleteTargetId?.targetType}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDeleteTargetId && deleteTarget(pendingDeleteTargetId)}
            >
              Delete
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

      <Dialog open={Boolean(noteReport)} onOpenChange={(open) => !open && setNoteReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin note</DialogTitle>
          </DialogHeader>
          <Textarea rows={4} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Internal note about this report..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteReport(null)}>
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={savingNote}>
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyReport)} onOpenChange={(open) => !open && setHistoryReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report history — {historyReport?.targetType} {historyReport?.targetId}</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-sm text-foreground/60">No other reports for this target.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((r) => (
                <li key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{r.reason}</span>
                    <Badge variant={r.status === "resolved" ? "success" : r.status === "dismissed" ? "secondary" : "warning"}>
                      {r.status}
                    </Badge>
                  </div>
                  {r.details ? <p className="mt-1 text-sm text-foreground/60">{r.details}</p> : null}
                  <p className="mt-1 text-xs text-foreground/40">{r.createdAt.toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
