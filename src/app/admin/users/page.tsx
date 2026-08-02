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
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleSection } from "@/components/admin/quick-create";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserProfile } from "@/types/user";

const EDIT_EMPTY = {
  fullName: "",
  email: "",
  bio: "",
  age: 0,
  university: "",
  occupation: "",
  maxBudget: 0,
  phone: "",
  telegram: "",
  whatsapp: "",
  instagram: "",
  contactsHidden: false,
  onboardingComplete: true,
  suspended: false,
  verified: false,
  lookingForApartment: true
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // WhatsApp/Instagram have no profile column; the list endpoint returns them
  // separately so the dialog can open with them filled rather than blank.
  const [contactsByUid, setContactsByUid] = useState<Record<string, { whatsapp: string; instagram: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load users.");
      setUsers(json.users ?? []);
      setContactsByUid(json.contacts ?? {});
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
    const extra = contactsByUid[user.uid] ?? { whatsapp: "", instagram: "" };
    setEditing(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email ?? "",
      bio: user.bio ?? "",
      age: user.age ?? 0,
      university: user.university ?? "",
      occupation: user.occupation ?? "",
      maxBudget: user.maxBudget ?? 0,
      phone: user.phone ?? "",
      telegram: user.telegram ?? "",
      whatsapp: extra.whatsapp,
      instagram: extra.instagram,
      contactsHidden: user.contactsHidden ?? false,
      onboardingComplete: user.onboardingComplete ?? true,
      suspended: user.suspended ?? false,
      verified: user.verified ?? false,
      lookingForApartment: user.lookingForApartment ?? true
    });
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
                    <Badge variant={user.role === ADMIN_ROLE ? "default" : "secondary"}>
                      {user.role === ADMIN_ROLE ? "admin" : "user"}
                    </Badge>
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
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <p className="text-sm text-foreground/60">Every field is editable, including onboarding and contacts.</p>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-user-name">Full name</Label>
                <Input id="edit-user-name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-user-email">Email</Label>
                <Input id="edit-user-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-bio">Bio</Label>
              <Textarea id="edit-user-bio" rows={3} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Contacts</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-phone" className="text-xs font-medium text-foreground/70">Phone</Label>
                  <Input id="edit-user-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-whatsapp" className="text-xs font-medium text-foreground/70">WhatsApp</Label>
                  <Input id="edit-user-whatsapp" value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-telegram" className="text-xs font-medium text-foreground/70">Telegram</Label>
                  <Input id="edit-user-telegram" value={editForm.telegram} onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-instagram" className="text-xs font-medium text-foreground/70">Instagram</Label>
                  <Input id="edit-user-instagram" value={editForm.instagram} onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })} />
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editForm.contactsHidden}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, contactsHidden: checked === true })}
                />
                Hide contacts from visitors
              </label>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Account state</p>
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editForm.onboardingComplete}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, onboardingComplete: checked === true })}
                  />
                  Onboarding complete
                  <span className="text-xs text-foreground/50">— clearing this sends them back through setup</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editForm.suspended}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, suspended: checked === true })}
                  />
                  Suspended
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editForm.verified}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, verified: checked === true })}
                  />
                  Verified
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editForm.lookingForApartment}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, lookingForApartment: checked === true })}
                  />
                  Published in roommate search
                </label>
              </div>
            </div>

            <CollapsibleSection title="Profile details" hint="all optional">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-user-age">Age</Label>
                    <Input
                      id="edit-user-age"
                      type="number"
                      min={0}
                      max={80}
                      placeholder="Not stated"
                      value={editForm.age || ""}
                      onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-user-university">University</Label>
                    <Input
                      id="edit-user-university"
                      value={editForm.university}
                      onChange={(e) => setEditForm({ ...editForm, university: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-user-occupation">Occupation</Label>
                    <Input
                      id="edit-user-occupation"
                      value={editForm.occupation}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-user-budget">Budget (₸)</Label>
                    <Input
                      id="edit-user-budget"
                      type="number"
                      min={0}
                      value={editForm.maxBudget}
                      onChange={(e) => setEditForm({ ...editForm, maxBudget: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>
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
