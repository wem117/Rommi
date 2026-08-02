"use client";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  EyeOff,
  Flag,
  Loader2,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  ShieldBan,
  ShieldCheck,
  Star,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  applyExtraction,
  CollapsibleSection,
  ContactFields,
  InternalBadge,
  PastePostBox,
  type ContactValues
} from "@/components/admin/quick-create";
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
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { UniversityCombobox } from "@/components/shared/university-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Report } from "@/types/report";
import type { UserProfile } from "@/types/user";

const EDIT_EMPTY = { fullName: "", university: "", occupation: "", bio: "" };

const CREATE_EMPTY = {
  // The three a post always carries, and without which the profile is useless.
  fullName: "",
  bio: "",
  maxBudget: 0,

  // Optional detail. Age 0 means "not stated": the profile card and the listing
  // sidebar already treat a falsy age that way and show a neutral label.
  age: 0,
  gender: "prefer_not_to_say" as "male" | "female" | "other" | "prefer_not_to_say",
  university: "",
  occupation: "",
  preferredMoveInDate: "",
  photoURL: "",
  lifestyle: {
    smoking: "no_preference" as const,
    pets: "no_preference" as const,
    cleanliness: "moderate" as "relaxed" | "moderate" | "very_clean",
    sleepSchedule: "balanced" as "early_bird" | "balanced" | "night_owl",
    guests: "sometimes" as "rarely" | "sometimes" | "often"
  },

  // Admin-only provenance; stored privately, never sent to a public page.
  sourceUrl: "",
  sourceTelegram: "",
  sourceWhatsapp: "",
  sourceFacebook: "",
  sourceNote: "",
  adminNotes: ""
};

export default function AdminRoommatesPage() {
  const [items, setItems] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserProfile | null>(null);
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
  const [creating, setCreating] = useState(false);
  const [activityUser, setActivityUser] = useState<UserProfile | null>(null);
  const [reportsUser, setReportsUser] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roommates");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.roommates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load roommates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) =>
      [item.fullName, item.email, item.university].some((value) => value && value.toLowerCase().includes(q))
    );
  }, [items, search]);

  const featured = useMemo(
    () => items.filter((item) => item.featured).sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0)),
    [items]
  );

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

  async function setStatus(uid: string, status: "approved" | "rejected") {
    setBusyId(uid);
    try {
      await patch(uid, { roommateStatus: status });
      toast.success(status === "approved" ? "Roommate approved" : "Roommate rejected");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleVerify(uid: string, verify: boolean) {
    setBusyId(uid);
    try {
      await patch(uid, { verified: verify });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSuspend(uid: string, suspend: boolean) {
    setBusyId(uid);
    try {
      await patch(uid, { suspended: suspend });
      toast.success(suspend ? "Roommate suspended" : "Suspension lifted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function resetVerification(uid: string) {
    try {
      await patch(uid, { verified: false });
      toast.success("Verification reset");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed");
    }
  }

  async function toggleContactsHidden(uid: string, hidden: boolean) {
    try {
      await patch(uid, { contactsHidden: hidden });
      toast.success(hidden ? "Contacts hidden" : "Contacts shown");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function resetFeatured(uid: string) {
    try {
      await patch(uid, { featured: false, featuredPosition: null });
      toast.success("Removed from featured");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed");
    }
  }

  async function openReports(item: UserProfile) {
    setReportsUser(item);
    setReportsLoading(true);
    try {
      const res = await fetch("/api/reports");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load reports");
      const all = (json.reports ?? []) as Report[];
      setReports(all.filter((r) => r.targetType === "user" && r.targetId === item.uid));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reports");
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }

  async function toggleFeatured(item: UserProfile) {
    setBusyId(item.uid);
    try {
      await patch(item.uid, {
        featured: !item.featured,
        featuredPosition: !item.featured ? items.filter((i) => i.featured).length : null
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
        patch(a.uid, { featuredPosition: b.featuredPosition ?? target }),
        patch(b.uid, { featuredPosition: a.featuredPosition ?? index })
      ]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reorder failed");
    }
  }

  function startEdit(item: UserProfile) {
    setEditing(item);
    setEditForm({
      fullName: item.fullName,
      university: item.university,
      occupation: item.occupation,
      bio: item.bio ?? ""
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await patch(editing.uid, editForm);
      toast.success("Profile updated");
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
      toast.success("Roommate deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function createNew() {
    setCreating(true);
    try {
      const { sourceUrl, sourceTelegram, sourceWhatsapp, sourceFacebook, sourceNote, adminNotes, ...profile } =
        createForm;
      const res = await fetch("/api/admin/roommates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          ...createContacts,
          source: { sourceUrl, sourceTelegram, sourceWhatsapp, sourceFacebook, sourceNote, adminNotes }
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      toast.success("Roommate published");
      setCreateOpen(false);
      setCreateForm(CREATE_EMPTY);
      setCreateContacts({ phone: "", whatsapp: "", telegram: "", instagram: "" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  /**
   * Fills blanks from a pasted post. The post's budget maps to `maxBudget` and
   * its move-in date to `preferredMoveInDate`, so those two are renamed before
   * merging; `applyExtraction` never overwrites what the admin already typed.
   */
  function fillFromPost(extracted: ExtractedPost) {
    const renamed: ExtractedPost = {
      ...extracted,
      found: extracted.found.map((f) =>
        f === "monthlyRent" ? "maxBudget" : f === "availableFrom" ? "preferredMoveInDate" : f
      )
    };
    const asRecord = renamed as unknown as Record<string, unknown>;
    if (extracted.monthlyRent !== undefined) asRecord.maxBudget = extracted.monthlyRent;
    if (extracted.availableFrom !== undefined) asRecord.preferredMoveInDate = extracted.availableFrom;
    // A post that says "для девушки" is describing the person, so it maps to the
    // profile's own gender rather than to a preference.
    if (extracted.genderPreference && extracted.genderPreference !== "any") {
      asRecord.gender = extracted.genderPreference;
      renamed.found = renamed.found.map((f) => (f === "genderPreference" ? "gender" : f));
    }

    const profilePart = applyExtraction(
      {
        maxBudget: createForm.maxBudget,
        preferredMoveInDate: createForm.preferredMoveInDate,
        gender: createForm.gender
      },
      renamed,
      (key, v) => (key === "gender" ? v === "prefer_not_to_say" : v === "" || v === 0)
    );
    const contactPart = applyExtraction(createContacts, renamed);

    if (profilePart.filled.length) setCreateForm((current) => ({ ...current, ...profilePart.next }));
    if (contactPart.filled.length) setCreateContacts(contactPart.next);

    return [...profilePart.filled, ...contactPart.filled];
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Roommates</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Moderate roommate profiles shown on the public Roommates page, and curate which ones are featured.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New roommate
        </Button>
      </div>

      {featured.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground/50">Featured order</h2>
          <ul className="mt-3 space-y-2">
            {featured.map((item, index) => (
              <li key={item.uid} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2">
                <span className="truncate text-sm font-semibold">{item.fullName}</span>
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

      <div className="mt-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or university" />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">No roommates found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>University</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.uid}>
                  <TableCell>
                    <p className="font-semibold">{item.fullName || "—"}</p>
                    <p className="text-xs text-foreground/50">{item.email || item.uid}</p>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70">{item.university || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.roommateStatus === "approved"
                          ? "success"
                          : item.roommateStatus === "rejected"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {item.roommateStatus ?? "approved"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.verified ? <Badge variant="secondary">Verified</Badge> : null}
                      {item.banned ? <Badge variant="destructive">Banned</Badge> : null}
                      {item.suspended ? <Badge variant="warning">Suspended</Badge> : null}
                      {item.featured ? <Badge variant="default">Featured</Badge> : null}
                      {item.contactsHidden ? <Badge variant="outline">Contacts hidden</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {item.roommateStatus !== "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === item.uid}
                          onClick={() => setStatus(item.uid, "approved")}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {item.roommateStatus !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === item.uid}
                          onClick={() => setStatus(item.uid, "rejected")}
                        >
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Toggle verified"
                        onClick={() => toggleVerify(item.uid, !item.verified)}
                        disabled={busyId === item.uid}
                      >
                        <ShieldCheck className={`h-4 w-4 ${item.verified ? "text-primary" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Toggle featured"
                        onClick={() => toggleFeatured(item)}
                        disabled={busyId === item.uid}
                      >
                        <Star className={`h-4 w-4 ${item.featured ? "fill-highlight text-highlight" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => startEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="More actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleSuspend(item.uid, !item.suspended)}>
                            <ShieldBan className="mr-2 h-4 w-4" />
                            {item.suspended ? "Unsuspend" : "Suspend"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetVerification(item.uid)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset verification
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetFeatured(item.uid)}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset featured
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleContactsHidden(item.uid, !item.contactsHidden)}>
                            {item.contactsHidden ? <Phone className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                            {item.contactsHidden ? "Show contacts" : "Hide contacts"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void openReports(item)}>
                            <Flag className="mr-2 h-4 w-4" />
                            View reports
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActivityUser(item)}>
                            <Activity className="mr-2 h-4 w-4" />
                            View activity
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPendingDeleteId(item.uid)}
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
            <DialogTitle>New roommate</DialogTitle>
            <p className="text-sm text-foreground/60">
              Paste the post, check the name and budget, publish. Everything else is optional.
            </p>
          </DialogHeader>

          <div className="grid gap-5">
            {/* The paste box doubles as the bio and as the source of every
                auto-filled field, so it comes first. */}
            <PastePostBox
              id="rc-bio"
              label="Paste the post"
              value={createForm.bio}
              placeholder={"Ищу соседку в квартиру рядом с КБТУ.\nБюджет до 90 000 тг.\nЗаселение с 1 сентября.\nWhatsApp +7 700 111 22 33"}
              onChange={(bio) => setCreateForm((current) => ({ ...current, bio }))}
              onExtract={fillFromPost}
            />

            {/* The two things that cannot be defaulted. A nickname is a valid
                name here — plenty of posts are signed "Аружан" and no more. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rc-name">Name or nickname</Label>
                <Input
                  id="rc-name"
                  value={createForm.fullName}
                  placeholder="Aruzhan"
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-budget">Budget (₸)</Label>
                <Input
                  id="rc-budget"
                  type="number"
                  min={0}
                  value={createForm.maxBudget || ""}
                  onChange={(e) => setCreateForm({ ...createForm, maxBudget: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">How to reach them</p>
              <p className="mb-3 mt-0.5 text-xs text-foreground/55">
                Copy whatever the post carried. All optional; only signed-in visitors ever see these.
              </p>
              <ContactFields idPrefix="rc" value={createContacts} onChange={setCreateContacts} />
            </div>

            <CollapsibleSection title="More details" hint="all optional">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-age">Age</Label>
                    <Input
                      id="rc-age"
                      type="number"
                      min={0}
                      max={80}
                      placeholder="Not stated"
                      value={createForm.age || ""}
                      onChange={(e) => setCreateForm({ ...createForm, age: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select
                      value={createForm.gender}
                      onValueChange={(v) => setCreateForm({ ...createForm, gender: v as typeof createForm.gender })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-university">University</Label>
                  <UniversityCombobox
                    id="rc-university"
                    value={createForm.university}
                    onChange={(value) => setCreateForm({ ...createForm, university: value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-occupation">Occupation</Label>
                    <Input
                      id="rc-occupation"
                      value={createForm.occupation}
                      placeholder="Student"
                      onChange={(e) => setCreateForm({ ...createForm, occupation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-movein">Move-in date</Label>
                    <Input
                      id="rc-movein"
                      type="date"
                      value={createForm.preferredMoveInDate}
                      onChange={(e) => setCreateForm({ ...createForm, preferredMoveInDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Photo</Label>
                  <AdminImageUpload
                    value={createForm.photoURL}
                    onChange={(url) => setCreateForm({ ...createForm, photoURL: url })}
                    placeholder="Photo URL (optional)"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cleanliness</Label>
                    <Select
                      value={createForm.lifestyle.cleanliness}
                      onValueChange={(v) =>
                        setCreateForm({
                          ...createForm,
                          lifestyle: { ...createForm.lifestyle, cleanliness: v as typeof createForm.lifestyle.cleanliness }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relaxed">Relaxed</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="very_clean">Very clean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sleep</Label>
                    <Select
                      value={createForm.lifestyle.sleepSchedule}
                      onValueChange={(v) =>
                        setCreateForm({
                          ...createForm,
                          lifestyle: { ...createForm.lifestyle, sleepSchedule: v as typeof createForm.lifestyle.sleepSchedule }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="early_bird">Early bird</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="night_owl">Night owl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Guests</Label>
                    <Select
                      value={createForm.lifestyle.guests}
                      onValueChange={(v) =>
                        setCreateForm({
                          ...createForm,
                          lifestyle: { ...createForm.lifestyle, guests: v as typeof createForm.lifestyle.guests }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rarely">Rarely</SelectItem>
                        <SelectItem value="sometimes">Sometimes</SelectItem>
                        <SelectItem value="often">Often</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Provenance. Private settings row; never reaches a public page. */}
            <CollapsibleSection title="Where it came from" icon={<InternalBadge />}>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-source-url" className="text-xs font-medium text-foreground/70">
                      Original post link
                    </Label>
                    <Input
                      id="rc-source-url"
                      placeholder="https://t.me/…"
                      value={createForm.sourceUrl}
                      onChange={(e) => setCreateForm({ ...createForm, sourceUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-source-telegram" className="text-xs font-medium text-foreground/70">
                      Telegram channel
                    </Label>
                    <Input
                      id="rc-source-telegram"
                      placeholder="KBTU chat"
                      value={createForm.sourceTelegram}
                      onChange={(e) => setCreateForm({ ...createForm, sourceTelegram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-source-whatsapp" className="text-xs font-medium text-foreground/70">
                      WhatsApp group
                    </Label>
                    <Input
                      id="rc-source-whatsapp"
                      value={createForm.sourceWhatsapp}
                      onChange={(e) => setCreateForm({ ...createForm, sourceWhatsapp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rc-source-facebook" className="text-xs font-medium text-foreground/70">
                      Facebook group
                    </Label>
                    <Input
                      id="rc-source-facebook"
                      value={createForm.sourceFacebook}
                      onChange={(e) => setCreateForm({ ...createForm, sourceFacebook: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-admin-notes" className="text-xs font-medium text-foreground/70">
                    Internal notes
                  </Label>
                  <Textarea
                    id="rc-admin-notes"
                    rows={2}
                    value={createForm.adminNotes}
                    onChange={(e) => setCreateForm({ ...createForm, adminNotes: e.target.value })}
                  />
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNew} disabled={creating}>
              {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input id="edit-name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-university">University</Label>
              <Input id="edit-university" value={editForm.university} onChange={(e) => setEditForm({ ...editForm, university: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-occupation">Occupation</Label>
              <Input id="edit-occupation" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea id="edit-bio" rows={4} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
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
            <AlertDialogTitle>Delete this roommate profile?</AlertDialogTitle>
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

      <Dialog open={Boolean(activityUser)} onOpenChange={(open) => !open && setActivityUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity — {activityUser?.fullName}</DialogTitle>
          </DialogHeader>
          {activityUser ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-foreground/50">Joined</dt>
              <dd>{formatDate(activityUser.createdAt)}</dd>
              <dt className="text-foreground/50">Last updated</dt>
              <dd>{formatDate(activityUser.updatedAt)}</dd>
              <dt className="text-foreground/50">Verified</dt>
              <dd>{activityUser.verified ? "Yes" : "No"}</dd>
              <dt className="text-foreground/50">Banned</dt>
              <dd>
                {activityUser.banned ? `Yes (${formatDate(activityUser.bannedAt)})` : "No"}
              </dd>
              <dt className="text-foreground/50">Suspended</dt>
              <dd>
                {activityUser.suspended ? `Yes (${formatDate(activityUser.suspendedAt)})` : "No"}
              </dd>
              <dt className="text-foreground/50">Favorited listings</dt>
              <dd>{activityUser.favoriteListingIds?.length ?? 0}</dd>
              <dt className="text-foreground/50">Viewed listings</dt>
              <dd>{activityUser.viewedListingIds?.length ?? 0}</dd>
              <dt className="text-foreground/50">Contacted listings</dt>
              <dd>{activityUser.contactedListingIds?.length ?? 0}</dd>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportsUser)}
        onOpenChange={(open) => {
          if (!open) {
            setReportsUser(null);
            setReports(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reports — {reportsUser?.fullName}</DialogTitle>
          </DialogHeader>
          {reportsLoading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !reports || reports.length === 0 ? (
            <p className="text-sm text-foreground/60">No reports filed against this user.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{report.reason}</span>
                    <Badge variant={report.status === "resolved" ? "success" : "warning"}>{report.status}</Badge>
                  </div>
                  {report.details ? <p className="mt-1 text-sm text-foreground/60">{report.details}</p> : null}
                  <p className="mt-1 text-xs text-foreground/40">{formatDate(report.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
