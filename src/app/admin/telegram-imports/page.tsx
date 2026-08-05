"use client";

import { AlertTriangle, Check, ChevronDown, Loader2, MessageSquareText, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { LocationPicker } from "@/components/map/location-picker";
import { CITIES } from "@/lib/constants/cities";
import type { TelegramImport } from "@/lib/data/telegram-imports";

type EditableFields = Pick<
  TelegramImport,
  | "title"
  | "description"
  | "city"
  | "district"
  | "address"
  | "price"
  | "rooms"
  | "propertyType"
  | "area"
  | "floor"
  | "totalFloors"
  | "contactPhone"
  | "contactTelegram"
  | "contactWhatsapp"
  | "lat"
  | "lng"
>;

function toEditable(item: TelegramImport): EditableFields {
  const {
    title,
    description,
    city,
    district,
    address,
    price,
    rooms,
    propertyType,
    area,
    floor,
    totalFloors,
    contactPhone,
    contactTelegram,
    contactWhatsapp,
    lat,
    lng
  } = item;
  return {
    title,
    description,
    city,
    district,
    address,
    price,
    rooms,
    propertyType,
    area,
    floor,
    totalFloors,
    contactPhone,
    contactTelegram,
    contactWhatsapp,
    lat,
    lng
  };
}

function ImportCard({ item, onChanged }: { item: TelegramImport; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<EditableFields>(() => toEditable(item));
  const [saving, setSaving] = useState<"save" | "approve" | "reject" | null>(null);
  const [showSourceText, setShowSourceText] = useState(false);

  function set<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(): Promise<boolean> {
    setSaving("save");
    try {
      const res = await fetch(`/api/admin/telegram-imports/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function approve() {
    if (form.lat == null || form.lng == null) {
      toast.error("Drop a pin on the map before approving.");
      return;
    }
    setSaving("approve");
    try {
      const saved = await save();
      if (!saved) return;

      const res = await fetch(`/api/admin/telegram-imports/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: form.lat, lng: form.lng })
      });
      const json = await res.json();

      if (res.status === 409 && json.duplicates?.length) {
        const proceed = window.confirm(
          `${json.duplicates.length} listing(s) at this address already exist. Approve anyway?`
        );
        if (!proceed) return;

        const retry = await fetch(`/api/admin/telegram-imports/${item.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: form.lat, lng: form.lng, ignoreDuplicates: true })
        });
        const retryJson = await retry.json();
        if (!retry.ok) throw new Error(retryJson.error ?? "Approve failed");
        toast.success("Listing published");
        onChanged();
        return;
      }

      if (!res.ok) throw new Error(json.error ?? "Approve failed");
      toast.success("Listing published");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approve failed");
    } finally {
      setSaving(null);
    }
  }

  async function reject() {
    if (!window.confirm("Reject this import? This cannot be undone.")) return;
    setSaving("reject");
    try {
      const res = await fetch(`/api/admin/telegram-imports/${item.id}/reject`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reject failed");
      toast.success("Import rejected");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed");
    } finally {
      setSaving(null);
    }
  }

  const busy = saving !== null;

  return (
    <li className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold">{form.title || "(no title extracted)"}</p>
          <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{form.description || "(no description)"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/55">
            <span>{form.city || "no city"}</span>
            <span>·</span>
            <span>{form.price ? `${form.price.toLocaleString()} KZT` : "no price"}</span>
            {item.photoUrls.length ? (
              <>
                <span>·</span>
                <span>{item.photoUrls.length} photo(s)</span>
              </>
            ) : null}
          </div>
          {item.extractionError ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {item.extractionError}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg p-2 text-foreground/60 hover:text-primary"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-border p-4">
          <button
            type="button"
            onClick={() => setShowSourceText((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            {showSourceText ? "Hide" : "Show"} original Telegram message
          </button>
          {showSourceText ? (
            <pre className="whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-xs text-foreground/80">
              {item.sourceContent || "(no message text)"}
            </pre>
          ) : null}

          {item.photoUrls.length ? (
            <div className="flex flex-wrap gap-2">
              {item.photoUrls.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg bg-surface-muted">
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <input
              type="number"
              placeholder="Price (KZT)"
              value={form.price || ""}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
            />
            <select value={form.city} onChange={(e) => set("city", e.target.value)}>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input placeholder="District" value={form.district} onChange={(e) => set("district", e.target.value)} />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="sm:col-span-2"
            />
            <select
              value={form.propertyType ?? ""}
              onChange={(e) => set("propertyType", (e.target.value || null) as EditableFields["propertyType"])}
            >
              <option value="">Property type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="dorm">Dorm</option>
              <option value="studio">Studio</option>
            </select>
            <input
              type="number"
              placeholder="Rooms"
              value={form.rooms ?? ""}
              onChange={(e) => set("rooms", e.target.value ? Number(e.target.value) : null)}
            />
            <input
              type="number"
              placeholder="Area (m²)"
              value={form.area ?? ""}
              onChange={(e) => set("area", e.target.value ? Number(e.target.value) : null)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Floor"
                value={form.floor ?? ""}
                onChange={(e) => set("floor", e.target.value ? Number(e.target.value) : null)}
              />
              <input
                type="number"
                placeholder="Total floors"
                value={form.totalFloors ?? ""}
                onChange={(e) => set("totalFloors", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="sm:col-span-2"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <input placeholder="Phone" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
            <input
              placeholder="Telegram"
              value={form.contactTelegram}
              onChange={(e) => set("contactTelegram", e.target.value)}
            />
            <input
              placeholder="WhatsApp"
              value={form.contactWhatsapp}
              onChange={(e) => set("contactWhatsapp", e.target.value)}
            />
          </div>

          <LocationPicker
            lat={form.lat}
            lng={form.lng}
            onCoordsChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
            address={form.address}
            onAddressChange={(value) => set("address", value)}
            showAddressField={false}
            labels={{
              mapLabel: "Location (required to approve)",
              mapHint: "Drop a pin at the property",
              selected: "Pin set",
              notSelected: "No pin set yet",
              clear: "Clear pin",
              addressLabel: "Address",
              addressHint: "Free text, not validated against a geocoder",
              addressPlaceholder: "e.g. ЖК Ауэзов Сити, 3 подъезд"
            }}
          />

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-surface-muted disabled:opacity-60"
            >
              {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </button>
            <button
              type="button"
              onClick={() => void reject()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
            >
              {saving === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Reject
            </button>
            <button
              type="button"
              onClick={() => void approve()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve & Publish
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function AdminTelegramImportsPage() {
  const [items, setItems] = useState<TelegramImport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/telegram-imports");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.imports);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load imports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Telegram Imports</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Listings extracted automatically from monitored Telegram channels/groups. Review, edit, and approve or
        reject each one — nothing here is published until you approve it.
      </p>

      <section className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">
            No pending imports. New Telegram listings will appear here as the telegram-service extracts them.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <ImportCard key={item.id} item={item} onChanged={() => void load()} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
