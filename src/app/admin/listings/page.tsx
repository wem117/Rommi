"use client";

import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminPhotoList } from "@/components/admin/admin-photo-list";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { CITIES } from "@/lib/constants/cities";

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
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Listing } from "@/types/listing";

const EDIT_EMPTY = {
  title: "",
  description: "",
  monthlyRent: 0,
  city: "",
  district: "",
  address: "",
  lat: "" as string,
  lng: "" as string
};

const CREATE_EMPTY = {
  title: "",
  description: "",
  monthlyRent: 0,
  depositRequired: false,
  depositAmount: 0,
  city: "Almaty",
  district: "",
  address: "",
  university: "",
  propertyType: "apartment" as "apartment" | "house" | "dorm" | "studio",
  listingType: "private_room" as "private_room" | "shared_room" | "entire_place",
  bedrooms: 1,
  bathrooms: 1,
  availableFrom: "",
  genderPreference: "any" as "any" | "male" | "female",
  smoking: "no" as "no" | "yes",
  pets: "no_pets" as "no_pets" | "allowed",
  photoUrls: [] as string[],
  // Which profile the listing belongs to. Left blank the listing would be filed
  // under the administrator's own account, and the public detail page renders
  // the owner's name, avatar and verified badge — so a seeded listing would
  // openly display the administrator's identity. Chosen explicitly instead.
  ownerId: "",
  // Admin-only. Stored in listing_admin_meta, never on the listing row, and
  // never sent to a public page.
  contactName: "",
  contactPhone: "",
  contactTelegram: "",
  sourceUrl: "",
  sourceNote: "",
  adminNotes: ""
};

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "archived" | "hidden";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_EMPTY);
  const [creating, setCreating] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; address: string; city: string }>>([]);
  // False until the listing_admin_meta migration is applied. The internal block
  // is hidden rather than shown-and-broken, so nothing the admin types is lost.
  const [metaAvailable, setMetaAvailable] = useState(true);
  const [owners, setOwners] = useState<Array<{ uid: string; fullName: string }>>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
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
      setMetaAvailable(json.metaAvailable !== false);
      // Candidate hosts for seeded listings. Admin-created profiles exist so
      // seeded inventory has a public face that is not the administrator's
      // personal account; nothing on them marks them as admin-created, which
      // is the point.
      try {
        const rr = await fetch("/api/admin/roommates");
        const rj = await rr.json();
        if (rr.ok) setOwners((rj.roommates ?? []).map((r: { uid: string; fullName: string }) => ({ uid: r.uid, fullName: r.fullName })));
      } catch {
        // Non-fatal: the picker simply stays empty.
      }
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
      address: listing.address,
      lat: listing.lat != null ? String(listing.lat) : "",
      lng: listing.lng != null ? String(listing.lng) : ""
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const { lat, lng, ...rest } = editForm;
      await patch(editing.id, {
        ...rest,
        lat: lat.trim() === "" ? null : Number(lat),
        lng: lng.trim() === "" ? null : Number(lng)
      });
      toast.success("Listing updated");
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function startCreate() {
    setCreateForm({ ...CREATE_EMPTY, availableFrom: new Date().toISOString().slice(0, 10) });
    setDuplicates([]);
    setCreateOpen(true);
  }

  /**
   * `publish` false stores the listing hidden, reusing the existing visibility
   * switch as draft state. `ignoreDuplicates` is set only after the admin has
   * been shown the matches and chosen to continue.
   */
  async function createNew(publish: boolean, ignoreDuplicates = false) {
    setCreating(true);
    try {
      const { contactName, contactPhone, contactTelegram, sourceUrl, sourceNote, adminNotes, ownerId, ...listing } = createForm;
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...listing,
          amenities: [],
          lat: null,
          lng: null,
          ...(ownerId ? { ownerId } : {}),
          publish,
          ignoreDuplicates,
          adminMeta: { contactName, contactPhone, contactTelegram, sourceUrl, sourceNote, adminNotes }
        })
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(json.duplicates)) {
        setDuplicates(json.duplicates);
        toast.error("Possible duplicate — review below.");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success(publish ? "Listing published" : "Draft saved (hidden)");
      setCreateOpen(false);
      setDuplicates([]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setCreating(false);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Listings</h1>
          <p className="mt-1 text-sm text-foreground/60">Moderate room listings and curate which ones are featured.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New listing
        </Button>
      </div>

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
                  <TableCell className="text-sm text-foreground/70">{formatCurrency(listing.monthlyRent)}</TableCell>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New listing</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-title">Title</Label>
              <Input
                id="create-title"
                value={createForm.title}
                placeholder="At least 8 characters"
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                rows={3}
                placeholder="At least 30 characters"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Property type</Label>
                <Select
                  value={createForm.propertyType}
                  onValueChange={(v) => setCreateForm({ ...createForm, propertyType: v as typeof createForm.propertyType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="dorm">Dorm</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Listing type</Label>
                <Select
                  value={createForm.listingType}
                  onValueChange={(v) => setCreateForm({ ...createForm, listingType: v as typeof createForm.listingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private_room">Private room</SelectItem>
                    <SelectItem value="shared_room">Shared room</SelectItem>
                    <SelectItem value="entire_place">Entire place</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-rent">Monthly rent (₸)</Label>
                <Input
                  id="create-rent"
                  type="number"
                  min={0}
                  value={createForm.monthlyRent}
                  onChange={(e) => setCreateForm({ ...createForm, monthlyRent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-available">Available from</Label>
                <Input
                  id="create-available"
                  type="date"
                  value={createForm.availableFrom}
                  onChange={(e) => setCreateForm({ ...createForm, availableFrom: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-deposit"
                checked={createForm.depositRequired}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, depositRequired: checked === true })}
              />
              <Label htmlFor="create-deposit">Deposit required</Label>
              {createForm.depositRequired ? (
                <Input
                  type="number"
                  min={0}
                  aria-label="Deposit amount (₸)"
                  className="ml-2 w-36"
                  value={createForm.depositAmount}
                  onChange={(e) => setCreateForm({ ...createForm, depositAmount: Number(e.target.value) })}
                />
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select value={createForm.city} onValueChange={(v) => setCreateForm({ ...createForm, city: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-district">District</Label>
                <Input
                  id="create-district"
                  value={createForm.district}
                  onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-university">Nearest university</Label>
              <UniversityCombobox
                id="create-university"
                value={createForm.university}
                onChange={(value) => setCreateForm({ ...createForm, university: value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-bedrooms">Bedrooms</Label>
                <Input
                  id="create-bedrooms"
                  type="number"
                  min={0}
                  max={20}
                  value={createForm.bedrooms}
                  onChange={(e) => setCreateForm({ ...createForm, bedrooms: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-bathrooms">Bathrooms</Label>
                <Input
                  id="create-bathrooms"
                  type="number"
                  min={0}
                  max={20}
                  value={createForm.bathrooms}
                  onChange={(e) => setCreateForm({ ...createForm, bathrooms: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Roommate gender</Label>
                <Select
                  value={createForm.genderPreference}
                  onValueChange={(v) => setCreateForm({ ...createForm, genderPreference: v as typeof createForm.genderPreference })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Smoking</Label>
                <Select
                  value={createForm.smoking}
                  onValueChange={(v) => setCreateForm({ ...createForm, smoking: v as typeof createForm.smoking })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pets</Label>
                <Select
                  value={createForm.pets}
                  onValueChange={(v) => setCreateForm({ ...createForm, pets: v as typeof createForm.pets })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_pets">No pets</SelectItem>
                    <SelectItem value="allowed">Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Photos (optional)</Label>
              <AdminPhotoList
                value={createForm.photoUrls}
                onChange={(urls) => setCreateForm({ ...createForm, photoUrls: urls })}
                onUploadingChange={setPhotoUploading}
              />
            </div>

            {/*
              Admin-only block. These values are stored in listing_admin_meta,
              which RLS restricts to admins — they are never returned to a
              public page, so a seeded listing is indistinguishable from an
              organic one to a regular user.
            */}
            <div className="space-y-1.5">
              <Label htmlFor="create-owner">Publish as (listing host)</Label>
              <Select
                value={createForm.ownerId || "__self__"}
                onValueChange={(v) => setCreateForm({ ...createForm, ownerId: v === "__self__" ? "" : v })}
              >
                <SelectTrigger id="create-owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__self__">My own account (not recommended)</SelectItem>
                  {owners.map((o) => (
                    <SelectItem key={o.uid} value={o.uid}>
                      {o.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.ownerId ? null : (
                <p className="text-xs text-destructive">
                  The room page shows the host&apos;s name, photo and verified badge. Left as your own account, visitors
                  see YOUR profile on this listing. Pick a host profile instead — create one under Admin → Roommates.
                </p>
              )}
            </div>

            {metaAvailable ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 p-4">
              <p className="text-sm font-semibold">Internal — admins only</p>
              <p className="mt-0.5 text-xs text-foreground/60">
                Never shown on the site. Use this for the landlord&apos;s real contact details and where you found the
                listing.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-contact-name">Landlord name</Label>
                  <Input
                    id="create-contact-name"
                    value={createForm.contactName}
                    onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-contact-phone">Phone</Label>
                  <Input
                    id="create-contact-phone"
                    value={createForm.contactPhone}
                    onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-contact-telegram">Telegram</Label>
                  <Input
                    id="create-contact-telegram"
                    value={createForm.contactTelegram}
                    onChange={(e) => setCreateForm({ ...createForm, contactTelegram: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="create-source-url">Source link</Label>
                  <Input
                    id="create-source-url"
                    placeholder="https://t.me/…"
                    value={createForm.sourceUrl}
                    onChange={(e) => setCreateForm({ ...createForm, sourceUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-source-note">Where it came from</Label>
                  <Input
                    id="create-source-note"
                    placeholder="KBTU chat, WhatsApp group…"
                    value={createForm.sourceNote}
                    onChange={(e) => setCreateForm({ ...createForm, sourceNote: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="create-admin-notes">Private notes</Label>
                <Textarea
                  id="create-admin-notes"
                  rows={2}
                  value={createForm.adminNotes}
                  onChange={(e) => setCreateForm({ ...createForm, adminNotes: e.target.value })}
                />
              </div>
            </div>
            ) : null}

            {duplicates.length ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">
                  {duplicates.length} existing listing{duplicates.length > 1 ? "s" : ""} look like this one
                </p>
                <ul className="mt-2 space-y-1 text-xs text-foreground/70">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      {d.title} — {d.address}, {d.city}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-foreground/60">
                  Two different rooms can share a building address, so this is a warning, not a block.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void createNew(false, duplicates.length > 0)}
              disabled={creating || photoUploading}
            >
              {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save as draft
            </Button>
            <Button onClick={() => void createNew(true, duplicates.length > 0)} disabled={creating || photoUploading}>
              {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {photoUploading ? "Uploading photo…" : duplicates.length ? "Create anyway" : "Create & publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-lat">Latitude</Label>
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  placeholder="43.238"
                  value={editForm.lat}
                  onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-lng">Longitude</Label>
                <Input
                  id="edit-lng"
                  type="number"
                  step="any"
                  placeholder="76.945"
                  value={editForm.lng}
                  onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                />
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
