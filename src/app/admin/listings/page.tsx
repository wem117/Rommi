"use client";

import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Star, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Listing } from "@/types/listing";

const EDIT_EMPTY = { title: "", description: "", monthlyRent: 0, city: "", district: "", address: "" };

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "archived" | "hidden";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load listings.");
      setListings(json.listings ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const featured = useMemo(
    () => listings.filter((l) => l.featured).sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0)),
    [listings]
  );

  const filtered = useMemo(() => {
    let next = listings;
    if (statusFilter === "archived") next = next.filter((l) => l.archived);
    else if (statusFilter === "hidden") next = next.filter((l) => l.removed);
    else if (statusFilter !== "all") next = next.filter((l) => l.status === statusFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      next = next.filter((l) =>
        [l.title, l.description, l.city, l.ownerId].some((v) => v && v.toLowerCase().includes(q))
      );
    }
    return next;
  }, [listings, statusFilter, search]);

  useEffect(() => {
    setSelected(new Set());
  }, [statusFilter, search]);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed");
    }
  }

  async function toggleVisibility(listing: Listing) {
    setBusyId(listing.id);
    try {
      const res = await fetch("/api/admin/listings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, action: listing.removed ? "restore" : "remove" })
      });
      if (!res.ok) throw new Error("Could not update listing visibility.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleArchive(listing: Listing) {
    setBusyId(listing.id);
    try {
      await patch(listing.id, { archived: !listing.archived });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    try {
      await patch(id, { status });
      toast.success(status === "approved" ? "Listing approved" : "Listing rejected");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeatured(listing: Listing) {
    setBusyId(listing.id);
    try {
      await patch(listing.id, {
        featured: !listing.featured,
        featuredPosition: !listing.featured ? listings.filter((l) => l.featured).length : null
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function moveFeatured(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= featured.length) return;
    const a = featured[index];
    const b = featured[target];
    try {
      await Promise.all([
        patch(a.id, { featuredPosition: b.featuredPosition ?? target }),
        patch(b.id, { featuredPosition: a.featuredPosition ?? index })
      ]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reorder failed");
    }
  }

  function startEdit(listing: Listing) {
    setEditing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description,
      monthlyRent: listing.monthlyRent,
      city: listing.city,
      district: listing.district ?? "",
      address: listing.address
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await patch(editing.id, editForm);
      toast.success("Listing updated");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Listing deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((current) => (current.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id))));
  }

  async function bulk(action: "approve" | "reject" | "archive" | "unarchive" | "delete") {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      if (action === "delete") {
        await Promise.all(ids.map((id) => fetch(`/api/admin/listings/${id}`, { method: "DELETE" })));
      } else if (action === "approve") {
        await Promise.all(ids.map((id) => patch(id, { status: "approved" })));
      } else if (action === "reject") {
        await Promise.all(ids.map((id) => patch(id, { status: "rejected" })));
      } else if (action === "archive") {
        await Promise.all(ids.map((id) => patch(id, { archived: true })));
      } else if (action === "unarchive") {
        await Promise.all(ids.map((id) => patch(id, { archived: false })));
      }
      toast.success(`Updated ${ids.length} listing${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Listings</h1>
      <p className="mt-1 text-sm text-foreground/60">Moderate room listings and curate which ones are featured.</p>

      {featured.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground/50">Featured order</h2>
          <ul className="mt-3 space-y-2">
            {featured.map((item, index) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2">
                <span className="truncate text-sm font-semibold">{item.title || "Untitled"}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveFeatured(index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveFeatured(index, 1)} disabled={index === featured.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, city, or owner" className="sm:flex-1" />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-muted p-3">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk("approve")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk("reject")}>
            Reject
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk("archive")}>
            Archive
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk("unarchive")}>
            Unarchive
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy}
            className="hover:bg-destructive/10 hover:text-destructive"
            onClick={() => bulk("delete")}
          >
            Delete
          </Button>
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">No listings found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Listing</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <Checkbox checked={selected.has(listing.id)} onCheckedChange={() => toggleSelect(listing.id)} aria-label="Select row" />
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">{listing.title || "Untitled"}</p>
                    <p className="text-xs text-foreground/50">
                      {listing.city} · Owner: {listing.ownerId}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70">{listing.monthlyRent.toLocaleString()} ₸</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        listing.status === "approved" ? "success" : listing.status === "rejected" ? "destructive" : "warning"
                      }
                    >
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {listing.removed ? <Badge variant="destructive">Hidden</Badge> : null}
                      {listing.archived ? <Badge variant="secondary">Archived</Badge> : null}
                      {listing.featured ? <Badge variant="default">Featured</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {listing.status !== "approved" ? (
                        <Button size="sm" variant="outline" disabled={busyId === listing.id} onClick={() => setStatus(listing.id, "approved")}>
                          Approve
                        </Button>
                      ) : null}
                      {listing.status !== "rejected" ? (
                        <Button size="sm" variant="outline" disabled={busyId === listing.id} onClick={() => setStatus(listing.id, "rejected")}>
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={listing.removed ? "Restore" : "Hide"}
                        onClick={() => toggleVisibility(listing)}
                        disabled={busyId === listing.id}
                      >
                        {listing.removed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={listing.archived ? "Unarchive" : "Archive"}
                        onClick={() => toggleArchive(listing)}
                        disabled={busyId === listing.id}
                      >
                        {listing.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Toggle featured"
                        onClick={() => toggleFeatured(listing)}
                        disabled={busyId === listing.id}
                      >
                        <Star className={`h-4 w-4 ${listing.featured ? "fill-highlight text-highlight" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => startEdit(listing)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPendingDeleteId(listing.id)}
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
            <DialogTitle>Edit listing</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rent">Monthly rent (₸)</Label>
                <Input
                  id="edit-rent"
                  type="number"
                  value={editForm.monthlyRent}
                  onChange={(e) => setEditForm({ ...editForm, monthlyRent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-district">District</Label>
                <Input id="edit-district" value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
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
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the listing. This cannot be undone.</AlertDialogDescription>
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
