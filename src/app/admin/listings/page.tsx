"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminPhotoList } from "@/components/admin/admin-photo-list";
import {
  applyExtraction,
  CollapsibleSection,
  ContactFields,
  InternalBadge,
  PastePostBox,
  type ContactValues
} from "@/components/admin/quick-create";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { CITIES } from "@/lib/constants/cities";
import type { ExtractedPost } from "@/lib/utils/post-parser";

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
import type { ListingAdminMeta } from "@/lib/data/listing-admin-meta";
import type { Listing } from "@/types/listing";

const EDIT_EMPTY = {
  title: "",
  description: "",
  monthlyRent: 0,
  city: "",
  district: "",
  address: "",
  university: "",
  propertyType: "apartment" as "apartment" | "house" | "dorm" | "studio",
  listingType: "private_room" as "private_room" | "shared_room" | "entire_place",
  bedrooms: 1,
  bathrooms: 1,
  depositRequired: false,
  depositAmount: 0,
  availableFrom: "",
  genderPreference: "any" as "any" | "male" | "female",
  smoking: "no" as "no" | "yes",
  pets: "no_pets" as "no_pets" | "allowed",
  photoUrls: [] as string[],
  lat: "" as string,
  lng: "" as string,
  sourceUrl: "",
  sourceTelegram: "",
  sourceWhatsapp: "",
  sourceFacebook: "",
  sourceNote: "",
  adminNotes: ""
};

const CREATE_EMPTY = {
  // What the admin cannot avoid supplying: without these the listing cannot be
  // read, priced or found. Everything else has a defensible default.
  title: "",
  description: "",
  monthlyRent: 0,
  city: "Almaty",

  // Optional detail, all behind a disclosure in the form.
  district: "",
  address: "",
  university: "",
  propertyType: "apartment" as "apartment" | "house" | "dorm" | "studio",
  listingType: "private_room" as "private_room" | "shared_room" | "entire_place",
  bedrooms: 1,
  bathrooms: 1,
  depositRequired: false,
  depositAmount: 0,
  availableFrom: "",
  genderPreference: "any" as "any" | "male" | "female",
  smoking: "no" as "no" | "yes",
  pets: "no_pets" as "no_pets" | "allowed",
  photoUrls: [] as string[],

  // Who the listing is published as. Landlords in these posts have no Roomi
  // account, so the default is to create a lightweight public profile for them
  // from the contacts in the post; `ownerId` reuses one already created.
  hostName: "",
  ownerId: "",

  // Admin-only provenance. Stored in a private settings row, never on the
  // listing and never sent to a public page.
  sourceUrl: "",
  sourceTelegram: "",
  sourceWhatsapp: "",
  sourceFacebook: "",
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
  const [createContacts, setCreateContacts] = useState<ContactValues>({
    phone: "",
    whatsapp: "",
    telegram: "",
    instagram: ""
  });
  // "new" builds a public profile from the contacts in the post (the normal
  // case — these landlords have no account); "existing" reuses one.
  const [hostMode, setHostMode] = useState<"new" | "existing">("new");
  const [creating, setCreating] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; address: string; city: string }>>([]);
  // False until the listing_admin_meta migration is applied. The internal block
  // is hidden rather than shown-and-broken, so nothing the admin types is lost.
  const [metaAvailable, setMetaAvailable] = useState(true);
  // Provenance per listing id, so the edit dialog opens with what is stored
  // rather than blanking it on save.
  const [meta, setMeta] = useState<Record<string, ListingAdminMeta>>({});
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
      setMeta(json.meta ?? {});
      // Candidate hosts for seeded listings. Admin-created profiles exist so
      // seeded inventory has a public face that is not the administrator's
      // personal account; nothing on them marks them as admin-created, which
      // is the point.
      try {
        // scope=all: a landlord is stored with looking_for_apartment=false so
        // they stay out of roommate search, and the default list would omit them.
        const rr = await fetch("/api/admin/roommates?scope=all");
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
      address: listing.address ?? "",
      university: listing.university ?? "",
      propertyType: listing.propertyType,
      listingType: listing.listingType,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      depositRequired: listing.depositRequired,
      depositAmount: listing.depositAmount,
      availableFrom: listing.availableFrom ? new Date(listing.availableFrom).toISOString().slice(0, 10) : "",
      genderPreference: listing.preferences?.genderPreference ?? "any",
      smoking: listing.preferences?.smoking ?? "no",
      pets: listing.preferences?.pets ?? "no_pets",
      photoUrls: listing.photoUrls ?? [],
      lat: listing.lat != null ? String(listing.lat) : "",
      lng: listing.lng != null ? String(listing.lng) : "",
      ...(meta[listing.id] ?? {
        sourceUrl: "",
        sourceTelegram: "",
        sourceWhatsapp: "",
        sourceFacebook: "",
        sourceNote: "",
        adminNotes: ""
      })
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const { lat, lng, sourceUrl, sourceTelegram, sourceWhatsapp, sourceFacebook, sourceNote, adminNotes, ...rest } =
        editForm;
      await patch(editing.id, {
        ...rest,
        lat: lat.trim() === "" ? null : Number(lat),
        lng: lng.trim() === "" ? null : Number(lng),
        adminMeta: { sourceUrl, sourceTelegram, sourceWhatsapp, sourceFacebook, sourceNote, adminNotes }
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

  /**
   * Copies a listing as a hidden draft.
   *
   * The same landlord routinely lists several near-identical rooms; this turns
   * a twenty-field re-entry into one click plus the two fields that differ. The
   * copy is never published — see the route handler for why.
   */
  async function duplicate(listing: Listing) {
    setBusyId(listing.id);
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/duplicate`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Duplicate failed");
      toast.success("Copied as a hidden draft — edit it, then publish");
      await load();
      if (json.listing) startEdit(json.listing as Listing);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplicate failed");
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Opens the dialog on a clean form, so a cancelled entry never leaks into the
   * next one. `availableFrom` is deliberately left blank: an absent move-in date
   * means "available now" on the server, and pre-filling today's date would
   * either be overwritten by the pasted post or publish a date nobody stated.
   */
  function startCreate() {
    setCreateForm(CREATE_EMPTY);
    setCreateContacts({ phone: "", whatsapp: "", telegram: "", instagram: "" });
    setHostMode("new");
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
      const {
        hostName,
        ownerId,
        sourceUrl,
        sourceTelegram,
        sourceWhatsapp,
        sourceFacebook,
        sourceNote,
        adminNotes,
        ...listing
      } = createForm;

      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...listing,
          publish,
          ignoreDuplicates,
          // A new public profile built from the post, or an existing one. Both
          // omitted, the server files it under the admin account and the form
          // has already warned about that.
          ...(hostMode === "new" && hostName.trim()
            ? { host: { displayName: hostName.trim(), ...createContacts } }
            : {}),
          ...(hostMode === "existing" && ownerId ? { ownerId } : {}),
          source: { sourceUrl, sourceTelegram, sourceWhatsapp, sourceFacebook, sourceNote, adminNotes }
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

  /**
   * Fills blanks from a pasted post. Contact fields and listing fields live in
   * two pieces of state, so each is merged separately; `applyExtraction` never
   * overwrites a value the admin has already typed.
   */
  function fillFromPost(extracted: ExtractedPost) {
    const listingPart = applyExtraction(
      { monthlyRent: createForm.monthlyRent, genderPreference: createForm.genderPreference, availableFrom: createForm.availableFrom },
      extracted,
      (key, v) => (key === "genderPreference" ? v === "any" : v === "" || v === 0)
    );
    const contactPart = applyExtraction(createContacts, extracted);

    if (listingPart.filled.length) setCreateForm((current) => ({ ...current, ...listingPart.next }));
    if (contactPart.filled.length) setCreateContacts(contactPart.next);

    return [...listingPart.filled, ...contactPart.filled];
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
                        aria-label="Duplicate"
                        title="Duplicate as a hidden draft"
                        onClick={() => void duplicate(listing)}
                        disabled={busyId === listing.id}
                      >
                        <Copy className="h-4 w-4" />
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
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New listing</DialogTitle>
            <p className="text-sm text-foreground/60">
              Paste the post, check the four fields below, publish. Everything else is optional.
            </p>
          </DialogHeader>

          <div className="grid gap-5">
            {/* 1. The paste box. It is the description AND the source of every
                auto-filled field, so it comes first — pasting is the first
                thing that happens in this workflow. */}
            <PastePostBox
              id="create-description"
              label="Paste the post"
              value={createForm.description}
              placeholder={"Сдаётся комната, Алматы, Бостандыкский р-н.\nДля девушки. 150 000 тг.\nЗаселение с 1 сентября.\n+7 701 234 56 78, есть WhatsApp"}
              onChange={(description) => setCreateForm((current) => ({ ...current, description }))}
              onExtract={fillFromPost}
            />

            {/* 2. The three things that cannot be defaulted. */}
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="create-title">Title</Label>
                <Input
                  id="create-title"
                  value={createForm.title}
                  placeholder="Room near KBTU"
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-rent">Rent (₸)</Label>
                <Input
                  id="create-rent"
                  type="number"
                  min={0}
                  value={createForm.monthlyRent || ""}
                  onChange={(e) => setCreateForm({ ...createForm, monthlyRent: Number(e.target.value) })}
                />
              </div>
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
            </div>

            {/* 3. Who it is published as. Almost nobody in these posts has a
                Roomi account, so creating a public profile for them is the
                default path, not an afterthought. */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Who is renting it out?</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => setHostMode(hostMode === "new" ? "existing" : "new")}
                >
                  {hostMode === "new" ? "Use a contact I already added" : "Add a new contact"}
                </button>
              </div>

              {hostMode === "new" ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-host-name">Display name</Label>
                    <Input
                      id="create-host-name"
                      value={createForm.hostName}
                      placeholder="Aigerim"
                      onChange={(e) => setCreateForm({ ...createForm, hostName: e.target.value })}
                    />
                  </div>
                  <ContactFields idPrefix="create-host" value={createContacts} onChange={setCreateContacts} />
                  <p className="text-xs text-foreground/55">
                    Creates a normal public profile — no account, no e-mail, no password. Visitors see the name and
                    contacts exactly as they would for any other host.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="create-owner">Existing contact</Label>
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
                </div>
              )}

              {hostMode === "existing" && !createForm.ownerId ? (
                <p className="mt-2 text-xs text-destructive">
                  The room page shows the host&apos;s name and photo. Left as your own account, visitors see YOUR
                  profile on this listing.
                </p>
              ) : null}
            </div>

            {/* 4. Everything that has a sane default, out of the way. */}
            <CollapsibleSection title="More details" hint="all optional">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-district">District</Label>
                    <Input
                      id="create-district"
                      value={createForm.district}
                      onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-address">Address</Label>
                    <Input
                      id="create-address"
                      value={createForm.address}
                      placeholder="Leave blank if the post has none"
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    />
                  </div>
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
                <div className="space-y-1.5">
                  <Label htmlFor="create-university">Nearest university</Label>
                  <UniversityCombobox
                    id="create-university"
                    value={createForm.university}
                    onChange={(value) => setCreateForm({ ...createForm, university: value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-available">Available from</Label>
                    <Input
                      id="create-available"
                      type="date"
                      value={createForm.availableFrom}
                      onChange={(e) => setCreateForm({ ...createForm, availableFrom: e.target.value })}
                    />
                  </div>
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
                    <Label>Tenant gender</Label>
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
                <div className="flex flex-wrap items-center gap-2">
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
                <div className="space-y-1.5">
                  <Label>Photos</Label>
                  <AdminPhotoList
                    value={createForm.photoUrls}
                    onChange={(urls) => setCreateForm({ ...createForm, photoUrls: urls })}
                    onUploadingChange={setPhotoUploading}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* 5. Provenance. Stored in a private settings row that the
                site_settings SELECT policy does not expose, so none of it can
                reach a public page. */}
            {metaAvailable ? (
              <CollapsibleSection title="Where it came from" icon={<InternalBadge />}>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-source-url" className="text-xs font-medium text-foreground/70">
                        Original post link
                      </Label>
                      <Input
                        id="create-source-url"
                        placeholder="https://t.me/…"
                        value={createForm.sourceUrl}
                        onChange={(e) => setCreateForm({ ...createForm, sourceUrl: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-source-telegram" className="text-xs font-medium text-foreground/70">
                        Telegram channel
                      </Label>
                      <Input
                        id="create-source-telegram"
                        placeholder="KBTU chat"
                        value={createForm.sourceTelegram}
                        onChange={(e) => setCreateForm({ ...createForm, sourceTelegram: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-source-whatsapp" className="text-xs font-medium text-foreground/70">
                        WhatsApp group
                      </Label>
                      <Input
                        id="create-source-whatsapp"
                        value={createForm.sourceWhatsapp}
                        onChange={(e) => setCreateForm({ ...createForm, sourceWhatsapp: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-source-facebook" className="text-xs font-medium text-foreground/70">
                        Facebook group
                      </Label>
                      <Input
                        id="create-source-facebook"
                        value={createForm.sourceFacebook}
                        onChange={(e) => setCreateForm({ ...createForm, sourceFacebook: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-admin-notes" className="text-xs font-medium text-foreground/70">
                      Internal notes
                    </Label>
                    <Textarea
                      id="create-admin-notes"
                      rows={2}
                      placeholder="Called, still free. Asked for photos."
                      value={createForm.adminNotes}
                      onChange={(e) => setCreateForm({ ...createForm, adminNotes: e.target.value })}
                    />
                  </div>
                </div>
              </CollapsibleSection>
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
              {photoUploading ? "Uploading photo…" : duplicates.length ? "Publish anyway" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
            <p className="text-sm text-foreground/60">
              Every field is editable. The essentials are here; the rest is one click away.
            </p>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={5}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rent">Rent (₸)</Label>
                <Input
                  id="edit-rent"
                  type="number"
                  min={0}
                  value={editForm.monthlyRent}
                  onChange={(e) => setEditForm({ ...editForm, monthlyRent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select value={editForm.city} onValueChange={(v) => setEditForm({ ...editForm, city: v })}>
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
                <Label htmlFor="edit-district">District</Label>
                <Input
                  id="edit-district"
                  value={editForm.district}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                />
              </div>
            </div>

            <CollapsibleSection title="More details" hint="all optional">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    placeholder="Leave blank if the post had none"
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Property type</Label>
                    <Select
                      value={editForm.propertyType}
                      onValueChange={(v) => setEditForm({ ...editForm, propertyType: v as typeof editForm.propertyType })}
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
                      value={editForm.listingType}
                      onValueChange={(v) => setEditForm({ ...editForm, listingType: v as typeof editForm.listingType })}
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
                <div className="space-y-1.5">
                  <Label htmlFor="edit-university">Nearest university</Label>
                  <UniversityCombobox
                    id="edit-university"
                    value={editForm.university}
                    onChange={(value) => setEditForm({ ...editForm, university: value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-available">Available from</Label>
                    <Input
                      id="edit-available"
                      type="date"
                      value={editForm.availableFrom}
                      onChange={(e) => setEditForm({ ...editForm, availableFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                    <Input
                      id="edit-bedrooms"
                      type="number"
                      min={0}
                      max={20}
                      value={editForm.bedrooms}
                      onChange={(e) => setEditForm({ ...editForm, bedrooms: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                    <Input
                      id="edit-bathrooms"
                      type="number"
                      min={0}
                      max={20}
                      value={editForm.bathrooms}
                      onChange={(e) => setEditForm({ ...editForm, bathrooms: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tenant gender</Label>
                    <Select
                      value={editForm.genderPreference}
                      onValueChange={(v) => setEditForm({ ...editForm, genderPreference: v as typeof editForm.genderPreference })}
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
                      value={editForm.smoking}
                      onValueChange={(v) => setEditForm({ ...editForm, smoking: v as typeof editForm.smoking })}
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
                      value={editForm.pets}
                      onValueChange={(v) => setEditForm({ ...editForm, pets: v as typeof editForm.pets })}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Checkbox
                    id="edit-deposit"
                    checked={editForm.depositRequired}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, depositRequired: checked === true })}
                  />
                  <Label htmlFor="edit-deposit">Deposit required</Label>
                  {editForm.depositRequired ? (
                    <Input
                      type="number"
                      min={0}
                      aria-label="Deposit amount (₸)"
                      className="ml-2 w-36"
                      value={editForm.depositAmount}
                      onChange={(e) => setEditForm({ ...editForm, depositAmount: Number(e.target.value) })}
                    />
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Photos</Label>
                  <AdminPhotoList
                    value={editForm.photoUrls}
                    onChange={(urls) => setEditForm({ ...editForm, photoUrls: urls })}
                    onUploadingChange={setPhotoUploading}
                  />
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
            </CollapsibleSection>

            {metaAvailable ? (
              <CollapsibleSection title="Where it came from" icon={<InternalBadge />}>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-source-url" className="text-xs font-medium text-foreground/70">
                        Original post link
                      </Label>
                      <Input
                        id="edit-source-url"
                        value={editForm.sourceUrl}
                        onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-source-telegram" className="text-xs font-medium text-foreground/70">
                        Telegram channel
                      </Label>
                      <Input
                        id="edit-source-telegram"
                        value={editForm.sourceTelegram}
                        onChange={(e) => setEditForm({ ...editForm, sourceTelegram: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-source-whatsapp" className="text-xs font-medium text-foreground/70">
                        WhatsApp group
                      </Label>
                      <Input
                        id="edit-source-whatsapp"
                        value={editForm.sourceWhatsapp}
                        onChange={(e) => setEditForm({ ...editForm, sourceWhatsapp: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-source-facebook" className="text-xs font-medium text-foreground/70">
                        Facebook group
                      </Label>
                      <Input
                        id="edit-source-facebook"
                        value={editForm.sourceFacebook}
                        onChange={(e) => setEditForm({ ...editForm, sourceFacebook: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-admin-notes" className="text-xs font-medium text-foreground/70">
                      Internal notes
                    </Label>
                    <Textarea
                      id="edit-admin-notes"
                      rows={2}
                      value={editForm.adminNotes}
                      onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                    />
                  </div>
                </div>
              </CollapsibleSection>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving || photoUploading}>
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
