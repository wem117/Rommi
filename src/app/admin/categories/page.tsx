"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  position: number;
  active: boolean;
};

const EMPTY_FORM = { name: "", slug: "", icon: "" };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.categories);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      const res = await fetch(isEdit ? `/api/admin/categories/${editingId}` : "/api/admin/categories", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, position: isEdit ? undefined : items.length })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success(isEdit ? "Category updated" : "Category added");
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed");
    }
  }

  async function toggleActive(item: Category) {
    try {
      await patch(item.id, { active: !item.active });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
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
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Category deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  }

  function startEdit(item: Category) {
    setEditingId(item.id);
    setForm({ name: item.name, slug: item.slug, icon: item.icon });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Property categories</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Manage the property category taxonomy (Apartment, House, Dormitory, Studio, Private Room, Shared Room, etc.)
        used in search filters and listing forms.
      </p>

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{editingId ? "Edit category" : "Add category"}</h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary">
              <X className="h-4 w-4" /> Cancel
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cat-name">Name *</Label>
            <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">Icon (lucide name)</Label>
            <Input id="cat-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Home" />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="cat-slug">Slug (optional, auto-generated from name)</Label>
            <Input id="cat-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Save changes" : "Add category"}
        </Button>
      </Card>

      <section className="mt-8">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">
            No categories yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${item.active ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-foreground/50">{item.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                      <ArrowDown className="h-4 w-4" />
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
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
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
