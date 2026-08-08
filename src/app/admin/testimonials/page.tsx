"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import type { Testimonial } from "@/lib/data/testimonials";

type AdminTestimonial = Testimonial & { position: number; active: boolean };

const EMPTY_FORM = { name: "", role: "", quote: "", imageUrl: "", badge: "", rating: 5, university: "", city: "" };

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
    // Name it in the prompt: an admin scanning a list of similar cards
    // needs to know WHICH one is about to be destroyed, and this is not
    // recoverable.
    const target = items.find((i) => i.id === id);
    if (!window.confirm(`Delete the testimonial from ${target?.name ?? "this person"}? This cannot be undone.`)) return;
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
    setForm({
      name: item.name,
      role: item.role,
      quote: item.quote,
      imageUrl: item.image,
      badge: item.badge,
      rating: item.rating ?? 5,
      university: item.university ?? "",
      city: item.city ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Testimonials</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Manage the testimonials shown on the home page. The section is hidden entirely when nothing is published — the home page never invents testimonials.
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
        {/* Visible labels, not placeholder-only. A placeholder disappears the
            moment there is a value, so an admin editing an existing testimonial
            was looking at six unlabelled boxes full of text. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Name *</Label>
            <input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-rating">Rating (1-5) *</Label>
            {/* The home page stars render THIS value, not a hardcoded five. */}
            <input
              id="t-rating"
              type="number"
              min={1}
              max={5}
              step={1}
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-university">University</Label>
            <input
              id="t-university"
              placeholder="e.g. KBTU"
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-city">City</Label>
            <input
              id="t-city"
              placeholder="e.g. Almaty"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-badge">Badge</Label>
            <input
              id="t-badge"
              placeholder="e.g. Verified Tenant"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Photo</Label>
            {/* The same uploader the universities admin uses, so files land in
                the existing Supabase bucket instead of an admin having to host
                an image elsewhere and paste a URL. */}
            <AdminImageUpload
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              placeholder="Avatar image URL"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="t-quote">Testimonial *</Label>
            <textarea
              id="t-quote"
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-foreground/50">
              Shown on the home page marquee. Keep it short — cards clamp to four lines.
            </p>
          </div>
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
            No testimonials yet. The home page hides the testimonials section until you publish one.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${item.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    {/* Order, avatar, status and rating at a glance — the four
                        things this page exists to control, previously none of
                        which were visible without opening the edit form. */}
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-muted text-xs font-semibold text-foreground/60">
                      {index + 1}
                    </span>

                    <span className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin-only list, avatars come from arbitrary hosts
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full place-items-center text-xs font-bold text-primary">
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                        {item.name}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            item.active
                              ? "bg-success/10 text-success ring-1 ring-inset ring-success/20"
                              : "bg-surface-muted text-foreground/55 ring-1 ring-inset ring-border"
                          }`}
                        >
                          {item.active ? "Published" : "Hidden"}
                        </span>
                        <span className="text-[11px] font-semibold text-highlight" aria-label={`Rating ${item.rating} of 5`}>
                          {"★".repeat(Math.max(1, Math.min(5, item.rating)))}
                          <span className="text-foreground/25">
                            {"★".repeat(5 - Math.max(1, Math.min(5, item.rating)))}
                          </span>
                        </span>
                      </p>
                      {[item.university, item.city].filter(Boolean).join(" · ") || item.role ? (
                        <p className="text-xs text-foreground/55">
                          {[item.university, item.city].filter(Boolean).join(" · ") || item.role}
                        </p>
                      ) : null}
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{item.quote}</p>
                    </div>
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
