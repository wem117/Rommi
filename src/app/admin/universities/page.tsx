"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminImageUpload } from "@/components/admin/admin-image-upload";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type University = {
  id: string;
  name: string;
  slug: string;
  city: string;
  description: string;
  image_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  position: number;
  active: boolean;
  featured: boolean;
  featured_position: number | null;
  listings_count_override: number | null;
  students_count_override: number | null;
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  city: "",
  description: "",
  imageUrl: "",
  logoUrl: "",
  coverImageUrl: "",
  listingsCountOverride: "",
  studentsCountOverride: ""
};

export default function AdminUniversitiesPage() {
  const [items, setItems] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/universities");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.universities);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load universities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const featured = useMemo(
    () => items.filter((i) => i.featured).sort((a, b) => (a.featured_position ?? 0) - (b.featured_position ?? 0)),
    [items]
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(editingId);
      // Empty digit field = no override (use the live count); otherwise a number.
      const toOverride = (value: string) => {
        if (value.trim() === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
      };
      const res = await fetch(isEdit ? `/api/admin/universities/${editingId}` : "/api/admin/universities", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          listingsCountOverride: toOverride(form.listingsCountOverride),
          studentsCountOverride: toOverride(form.studentsCountOverride),
          position: isEdit ? undefined : items.length
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success(isEdit ? "University updated" : "University added");
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/universities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed");
    }
  }

  async function toggleActive(item: University) {
    try {
      await patch(item.id, { active: !item.active });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function toggleFeatured(item: University) {
    try {
      await patch(item.id, {
        featured: !item.featured,
        featuredPosition: !item.featured ? items.filter((i) => i.featured).length : null
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function moveFeatured(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= featured.length) return;
    const a = featured[index];
    const b = featured[target];
    try {
      await Promise.all([
        patch(a.id, { featuredPosition: b.featured_position ?? target }),
        patch(b.id, { featuredPosition: a.featured_position ?? index })
      ]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reorder failed");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    try {
      await Promise.all([patch(a.id, { position: b.position }), patch(b.id, { position: a.position })]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reorder failed");
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/admin/universities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("University deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  }

  function startEdit(item: University) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      slug: item.slug,
      city: item.city,
      description: item.description,
      imageUrl: item.image_url ?? "",
      logoUrl: item.logo_url ?? "",
      coverImageUrl: item.cover_image_url ?? "",
      listingsCountOverride: item.listings_count_override?.toString() ?? "",
      studentsCountOverride: item.students_count_override?.toString() ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Universities</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Manage the university directory shown on the home page and the Universities page. Featured universities appear
        as hub cards on the home page.
      </p>

      {featured.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground/50">Featured order (home page)</h2>
          <ul className="mt-3 space-y-2">
            {featured.map((item, index) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2">
                <span className="truncate text-sm font-semibold">{item.name}</span>
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

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{editingId ? "Edit university" : "Add university"}</h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary">
              <X className="h-4 w-4" /> Cancel
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="uni-name">Name *</Label>
            <Input id="uni-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-city">City</Label>
            <Input id="uni-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-slug">Slug (optional, auto-generated from name)</Label>
            <Input id="uni-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-image">Hub card image</Label>
            <AdminImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} placeholder="Hub card image URL" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-logo">Logo</Label>
            <AdminImageUpload value={form.logoUrl} onChange={(url) => setForm({ ...form, logoUrl: url })} placeholder="Logo URL" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-cover">Cover image</Label>
            <AdminImageUpload value={form.coverImageUrl} onChange={(url) => setForm({ ...form, coverImageUrl: url })} placeholder="Cover image URL" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-listings-count">Listings count (hub card)</Label>
            <Input
              id="uni-listings-count"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Auto (live count)"
              value={form.listingsCountOverride}
              onChange={(e) => setForm({ ...form, listingsCountOverride: e.target.value })}
            />
            <p className="text-xs text-foreground/50">Leave empty to use the live listing count.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-students-count">Students count (hub card)</Label>
            <Input
              id="uni-students-count"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Auto (live count)"
              value={form.studentsCountOverride}
              onChange={(e) => setForm({ ...form, studentsCountOverride: e.target.value })}
            />
            <p className="text-xs text-foreground/50">Leave empty to use the live student count.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="uni-description">Description</Label>
            <Textarea
              id="uni-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Save changes" : "Add university"}
        </Button>
      </Card>

      <section className="mt-8">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">
            No universities yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${item.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {item.name}
                      {item.city ? <span className="font-normal text-foreground/55"> · {item.city}</span> : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{item.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Toggle featured" onClick={() => toggleFeatured(item)}>
                      <Star className={`h-4 w-4 ${item.featured ? "fill-highlight text-highlight" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={item.active ? "Hide" : "Show"} onClick={() => toggleActive(item)}>
                      {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => startEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      className="hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPendingDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete university?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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
