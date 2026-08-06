"use client";

import { AlertTriangle, Check, ChevronDown, Loader2, MessageSquareText, Search, Trash2, User, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { LocationPicker } from "@/components/map/location-picker";
import { CITIES } from "@/lib/constants/cities";
import type { TelegramImport } from "@/lib/data/telegram-imports";
import { KNOWN_AMENITIES } from "@/lib/utils/amenities";

const AMENITY_OPTIONS = Array.from(KNOWN_AMENITIES);

type EditableFields = Pick<
  TelegramImport,
  | "title"
  | "description"
  | "city"
  | "district"
  | "address"
  | "zhk"
  | "university"
  | "price"
  | "rooms"
  | "propertyType"
  | "area"
  | "floor"
  | "totalFloors"
  | "capacity"
  | "amenities"
  | "depositAmount"
  | "depositRequired"
  | "utilitiesIncluded"
  | "contactPhone"
  | "contactTelegram"
  | "contactWhatsapp"
  | "photoUrls"
  | "lat"
  | "lng"
>;

const EDITABLE_KEYS = [
  "title",
  "description",
  "city",
  "district",
  "address",
  "zhk",
  "university",
  "price",
  "rooms",
  "propertyType",
  "area",
  "floor",
  "totalFloors",
  "capacity",
  "amenities",
  "depositAmount",
  "depositRequired",
  "utilitiesIncluded",
  "contactPhone",
  "contactTelegram",
  "contactWhatsapp",
  "photoUrls",
  "lat",
  "lng"
] as const satisfies readonly (keyof EditableFields)[];

function toEditable(item: TelegramImport): EditableFields {
  return Object.fromEntries(EDITABLE_KEYS.map((key) => [key, item[key]])) as EditableFields;
}

/**
 * What this draft BECOMES on approval — the decision the reviewer is making.
 *
 * A roommate search publishes as a profile in the /roommates directory, not as
 * a property listing, so the badge says so rather than describing the wording.
 */
const DRAFT_KIND_LABELS: Record<TelegramImport["draftKind"], { label: string; className: string }> = {
  listing: { label: "Property listing", className: "bg-success/15 text-success" },
  roommate: { label: "Roommate search → profile", className: "bg-primary/15 text-primary" },
  unknown: { label: "Needs a decision", className: "bg-highlight/25 text-foreground/75" }
};

/** The wording the parser read, shown as secondary context. */
const LISTING_KIND_LABELS: Record<TelegramImport["listingKind"], string> = {
  offer: "whole place offered",
  shared: "room / shared",
  seeking: "looking for housing",
  unknown: "intent unclear"
};

function Tristate({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  // Three states, not a checkbox: "the post did not say" is different from
  // "no", and collapsing them would have the admin publish a guess.
  return (
    <label className="space-y-1.5 text-xs font-medium text-foreground/70">
      <span>{label}</span>
      <select
        value={value === null ? "" : String(value)}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value === "true")}
      >
        <option value="">Not stated</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

function ImportCard({ item, onChanged }: { item: TelegramImport; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<EditableFields>(() => toEditable(item));
  const [saving, setSaving] = useState<"save" | "approve" | "reject" | null>(null);
  const [showSourceText, setShowSourceText] = useState(false);

  function set<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAmenity(amenity: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((value) => value !== amenity)
        : [...prev.amenities, amenity]
    }));
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

  async function postApprove(extra: Record<string, unknown>) {
    return fetch(`/api/admin/telegram-imports/${item.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: form.lat, lng: form.lng, ...extra })
    });
  }

  async function approve() {
    setSaving("approve");
    try {
      const saved = await save();
      if (!saved) return;

      // Each 409 the route can raise is a question for the admin, asked once
      // and then carried into the retry as an explicit confirmation.
      const overrides: Record<string, unknown> = {};
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const res = await postApprove(overrides);
        const json = await res.json();

        if (res.ok) {
          toast.success(json.kind === "roommate" ? "Roommate profile published" : "Listing published");
          onChanged();
          return;
        }

        if (res.status === 409 && json.needsKindConfirmation) {
          if (!window.confirm(`${json.error}\n\nPublish it as a property listing?`)) return;
          overrides.confirmKindOverride = true;
          continue;
        }

        if (res.status === 409 && json.duplicates?.length) {
          const proceed = window.confirm(
            `${json.duplicates.length} listing(s) at this address already exist. Approve anyway?`
          );
          if (!proceed) return;
          overrides.ignoreDuplicates = true;
          continue;
        }

        throw new Error(json.error ?? "Approve failed");
      }
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
  const kind = DRAFT_KIND_LABELS[item.draftKind] ?? DRAFT_KIND_LABELS.unknown;
  const isRoommate = item.draftKind === "roommate";
  const senderName = item.sender?.displayName || item.sender?.username || "";

  return (
    <li className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${kind.className}`}>
              {kind.label}
            </span>
            <span className="text-[11px] text-foreground/45">
              {LISTING_KIND_LABELS[item.listingKind]} · confidence {item.confidence}
            </span>
            {item.parserVersion ? (
              <span className="text-[11px] text-foreground/40">parser {item.parserVersion}</span>
            ) : null}
          </div>
          <p className="mt-1.5 font-semibold">{form.title || "(no title extracted)"}</p>
          <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{form.description || "(no description)"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/55">
            <span>{form.city || "no city"}</span>
            <span>·</span>
            <span>{form.price ? `${form.price.toLocaleString()} KZT` : "no price"}</span>
            {form.zhk ? (
              <>
                <span>·</span>
                <span>ЖК {form.zhk}</span>
              </>
            ) : null}
            {form.photoUrls.length ? (
              <>
                <span>·</span>
                <span>{form.photoUrls.length} photo(s)</span>
              </>
            ) : null}
            {senderName ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {senderName}
                  {item.sender?.username ? ` (@${item.sender.username})` : ""}
                </span>
              </>
            ) : null}
          </div>
          {item.publishBlockers.length ? (
            <p className="mt-2 text-xs text-foreground/50">
              Held for review: {item.publishBlockers.join("; ")}
            </p>
          ) : null}
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
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-muted p-3 text-xs text-foreground/80">
              {item.sourceContent || "(no message text)"}
            </pre>
          ) : null}

          {form.photoUrls.length ? (
            <div className="flex flex-wrap gap-2">
              {form.photoUrls.map((url) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg bg-surface-muted">
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "photoUrls",
                        form.photoUrls.filter((value) => value !== url)
                      )
                    }
                    className="absolute right-1 top-1 rounded-full bg-background/85 p-1 text-destructive opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-foreground/50">No photos were attached to this post.</p>
          )}

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
            <input placeholder="ЖК / complex" value={form.zhk} onChange={(e) => set("zhk", e.target.value)} />
            <input
              placeholder="University"
              value={form.university}
              onChange={(e) => set("university", e.target.value)}
            />
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
            <input
              type="number"
              placeholder="Capacity (people)"
              value={form.capacity ?? ""}
              onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)}
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
            <input
              type="number"
              placeholder="Deposit (KZT)"
              value={form.depositAmount ?? ""}
              onChange={(e) => set("depositAmount", e.target.value ? Number(e.target.value) : null)}
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="sm:col-span-2"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Tristate
              label="Deposit required"
              value={form.depositRequired}
              onChange={(value) => set("depositRequired", value)}
            />
            <Tristate
              label="Utilities included in the price"
              value={form.utilitiesIncluded}
              onChange={(value) => set("utilitiesIncluded", value)}
            />
          </div>
          {item.depositNote || item.utilitiesNote ? (
            <p className="text-xs text-foreground/50">
              From the post: {[item.depositNote, item.utilitiesNote].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium text-foreground/70">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => {
                const active = form.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground/60 hover:bg-surface-muted"
                    }`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
            {form.amenities.filter((a) => !KNOWN_AMENITIES.has(a)).length ? (
              <p className="mt-2 text-xs text-foreground/50">
                Also detected: {form.amenities.filter((a) => !KNOWN_AMENITIES.has(a)).join(", ")}
              </p>
            ) : null}
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
          {item.contactPhoneRaw && item.contactPhoneRaw !== item.contactPhone ? (
            <p className="text-xs text-foreground/50">Phone as written in the post: {item.contactPhoneRaw}</p>
          ) : null}

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
              {isRoommate ? "Approve as roommate" : "Approve & Publish"}
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
  const [query, setQuery] = useState("");

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

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) =>
        [item.title, item.city, item.zhk, item.district, item.sourceContent ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
    : items;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Telegram Imports</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Listings parsed automatically from monitored Telegram channels/groups. Review, edit, and approve or reject
        each one — nothing here is published until you approve it.
      </p>

      {items.length ? (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by title, city, ЖК or message text"
            className="w-full pl-9"
          />
        </div>
      ) : null}

      <section className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/60">
            {items.length
              ? "No imports match that filter."
              : "No pending imports. New Telegram listings will appear here as the telegram-service parses them."}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <ImportCard key={item.id} item={item} onChanged={() => void load()} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
