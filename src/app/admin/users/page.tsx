"use client";

import { ExternalLink, Loader2, Pencil, ShieldAlert, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserProfile } from "@/types/user";

const EDIT_EMPTY = { fullName: "", email: "", university: "" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load users.");
      setUsers(json.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((user) => [user.fullName, user.email, user.uid].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [search, users]);

  async function patch(uid: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed");
    }
  }

  async function toggleBan(userId: string, ban: boolean) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ban })
      });
      if (!res.ok) throw new Error("Could not update user status.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSuspend(userId: string, suspend: boolean) {
    setBusyId(userId);
    try {
      await patch(userId, { suspended: suspend });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVerify(userId: string, verify: boolean) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, verify })
      });
      if (!res.ok) throw new Error("Could not update verification.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(user: UserProfile) {
    setEditing(user);
    setEditForm({ fullName: user.fullName, email: user.email ?? "", university: user.university });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await patch(editing.uid, editForm);
      toast.success("User updated");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(uid: string) {
    try {
      const res = await fetch(`/api/admin/users/${uid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("User deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
      <p className="mt-1 text-sm text-foreground/60">Search profiles, verify accounts, and manage membership.</p>

      <div className="mt-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or ID" />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-semibold">
                      {user.fullName || "—"}
                      {user.verified ? <ShieldCheck className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <p className="text-xs text-foreground/50">{user.email || user.uid}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role || "user"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.verified ? <Badge variant="secondary">Verified</Badge> : null}
                      {user.banned ? <Badge variant="destructive">Banned</Badge> : null}
                      {user.suspended ? <Badge variant="warning">Suspended</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="View profile" asChild>
                        <a href={`/roommates/${user.uid}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={user.verified ? "Revoke verification" : "Verify"}
                        onClick={() => toggleVerify(user.uid, !user.verified)}
                        disabled={busyId === user.uid}
                      >
                        {busyId === user.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className={`h-4 w-4 ${user.verified ? "text-primary" : ""}`} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={user.banned ? "Unban" : "Ban"}
                        onClick={() => toggleBan(user.uid, !user.banned)}
                        disabled={busyId === user.uid}
                        className={user.banned ? "" : "hover:bg-destructive/10 hover:text-destructive"}
                      >
                        <ShieldAlert className={`h-4 w-4 ${user.banned ? "text-destructive" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={user.suspended ? "Unsuspend" : "Suspend"}
                        onClick={() => toggleSuspend(user.uid, !user.suspended)}
                        disabled={busyId === user.uid}
                      >
                        <ShieldBan className={`h-4 w-4 ${user.suspended ? "text-accent" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => startEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPendingDeleteId(user.uid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">Full name</Label>
              <Input id="edit-user-name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input id="edit-user-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-university">University</Label>
              <Input id="edit-user-university" value={editForm.university} onChange={(e) => setEditForm({ ...editForm, university: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the user&apos;s profile and account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDeleteId && remove(pendingDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
