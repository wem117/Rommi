"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Testimonial } from "@/lib/data/testimonials";

type AdminTestimonial = Testimonial & { position: number; active: boolean };

const EMPTY_FORM = { name: "", role: "", quote: "", imageUrl: "", badge: "", rating: 5 };

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/testimonials");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.testimonials);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load testimonials");
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
    if (!form.name.trim() || !form.quote.trim()) {
      toast.error("Name and quote are required.");
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(editingId);
      const res = await fetch(
        isEdit ? `/api/admin/testimonials/${editingId}` : "/api/admin/testimonials",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, position: isEdit ? undefined : items.length })
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success(isEdit ? "Testimonial updated" : "Testimonial added");
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/testimonials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Update failed");
    }
  }

  async function toggleActive(item: AdminTestimonial) {
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
    if (!window.confirm("Delete this testimonial?")) return;
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Testimonial deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function startEdit(item: AdminTestimonial) {
    setEditingId(item.id);
    setForm({ name: item.name, role: item.role, quote: item.quote, imageUrl: item.image, badge: item.badge, rating: item.rating ?? 5 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Testimonials</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Manage the testimonials shown on the home page. When none are active, demo testimonials are shown.
      </p>

      {/* Form */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{editingId ? "Edit testimonial" : "Add testimonial"}</h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-primary">
              <X className="h-4 w-4" /> Cancel
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Role (e.g. Student at KazNU)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <input placeholder="Badge (e.g. Verified Tenant)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
          {/* The stars on the home page render this, rather than a hardcoded five. */}
          <input type="number" min={1} max={5} placeholder="Rating (1-5)" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
          <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <textarea
            placeholder="Quote *"
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            className="sm:col-span-2"
            rows={3}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Save changes" : "Add testimonial"}
        </button>
      </section>

      {/* List */}
      <section className="mt-8">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">
            No testimonials yet. The home page is showing demo content.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${item.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {item.name}
                      {item.role ? <span className="font-normal text-foreground/55"> · {item.role}</span> : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{item.quote}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="Move up" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg p-2 text-foreground/60 hover:text-primary disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="rounded-lg p-2 text-foreground/60 hover:text-primary disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={item.active ? "Hide" : "Show"} onClick={() => toggleActive(item)} className="rounded-lg p-2 text-foreground/60 hover:text-primary">
                      {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button type="button" aria-label="Edit" onClick={() => startEdit(item)} className="rounded-lg p-2 text-foreground/60 hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Delete" onClick={() => remove(item.id)} className="rounded-lg p-2 text-foreground/60 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
