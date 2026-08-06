"use client";

import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useLocale } from "@/context/locale-context";
import type { MyListingsPage } from "@/lib/data/my-listings";
import { listingStatus, type MyListingStatus } from "@/lib/utils/listing-status";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Listing } from "@/types/listing";
import type { UserProfile } from "@/types/user";

/**
 * "My Listings".
 *
 * Data arrives fully resolved from the server; this component only handles what
 * genuinely needs the client — tab state, the confirm dialog, and the action
 * calls. Filtering, sorting and paging are URL state driven by the server query,
 * so a filtered view is linkable, survives a refresh, and never re-fetches the
 * whole set into the browser to slice it there.
 *
 * The Roommates tab shows the user's OWN profile. There is no roommate-listing
 * table in this schema: a profile becomes a roommate listing when
 * `looking_for_apartment` is set, so this reflects that rather than duplicating
 * it into a second table.
 */
export default function MyListingsClient({
  initial,
  profile,
  filters
}: {
  initial: MyListingsPage;
  profile: UserProfile | null;
  filters: { q: string; city: string; status: MyListingStatus | "all"; sort: string };
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"apartments" | "roommates">("apartments");
  const [search, setSearch] = useState(filters.q);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Listing | null>(null);

  /** All navigation is URL-driven so every view is shareable and refresh-safe. */
  function apply(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (!("page" in next)) params.delete("page");
    startTransition(() => router.push(`/my-listings?${params.toString()}`));
  }

  async function act(listing: Listing, action: "archive" | "unarchive" | "duplicate" | "delete") {
    setBusyId(listing.id);
    try {
      let res: Response;
      if (action === "duplicate") {
        res = await fetch(`/api/my-listings/${listing.id}/duplicate`, { method: "POST" });
      } else if (action === "delete") {
        res = await fetch(`/api/my-listings/${listing.id}`, { method: "DELETE" });
      } else {
        res = await fetch(`/api/my-listings/${listing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: action === "archive" })
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? t("myListings.actionFailed"));
      toast.success(t(`myListings.${action}Done`));
      setConfirmDelete(null);
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("myListings.actionFailed"));
    } finally {
      setBusyId(null);
    }
  }

  const showRoommate = Boolean(profile?.lookingForApartment);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("myListings.title")}</h1>
        <Link
          href="/list-a-room/step-1"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("myListings.create")}
        </Link>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t("myListings.title")} className="mt-5 flex gap-2 border-b border-border">
        {(["apartments", "roommates"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold transition ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-foreground/55 hover:text-foreground"
            }`}
          >
            {t(`myListings.${key}`)}
            {key === "apartments" ? ` (${initial.total})` : ` (${showRoommate ? 1 : 0})`}
          </button>
        ))}
      </div>

      {tab === "apartments" ? (
        <>
          {/* Filters — submit through the URL, not local state. */}
          <form
            className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              apply({ q: search || undefined });
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("myListings.searchPlaceholder")}
                aria-label={t("myListings.searchPlaceholder")}
                className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm"
              />
            </div>

            <select
              value={filters.city}
              onChange={(event) => apply({ city: event.target.value || undefined })}
              aria-label={t("myListings.filterCity")}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">{t("myListings.allCities")}</option>
              {initial.cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) => apply({ status: event.target.value })}
              aria-label={t("myListings.filterStatus")}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
            >
              {(["all", "published", "pending", "draft", "archived", "rejected"] as const).map((s) => (
                <option key={s} value={s}>{t(`myListings.status.${s}`)}</option>
              ))}
            </select>

            <select
              value={filters.sort}
              onChange={(event) => apply({ sort: event.target.value })}
              aria-label={t("myListings.sort")}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="newest">{t("myListings.sortNewest")}</option>
              <option value="oldest">{t("myListings.sortOldest")}</option>
              <option value="updated">{t("myListings.sortUpdated")}</option>
            </select>
          </form>

          {pending ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-surface-muted" />
              ))}
            </div>
          ) : initial.listings.length ? (
            <>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {initial.listings.map((listing) => (
                  <li key={listing.id}>
                    <ListingRow
                      listing={listing}
                      busy={busyId === listing.id}
                      locale={locale}
                      t={t}
                      onAction={act}
                      onDeleteRequest={setConfirmDelete}
                    />
                  </li>
                ))}
              </ul>

              {initial.totalPages > 1 ? (
                <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label={t("myListings.pagination")}>
                  {Array.from({ length: initial.totalPages }).map((_, index) => {
                    const p = index + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => apply({ page: String(p) })}
                        aria-current={p === initial.page ? "page" : undefined}
                        className={`min-h-10 min-w-10 rounded-full border px-3 text-sm font-semibold ${
                          p === initial.page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-foreground/60">{t("myListings.empty")}</p>
              <Link
                href="/list-a-room/step-1"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("myListings.create")}
              </Link>
            </div>
          )}
        </>
      ) : showRoommate && profile ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-muted">
              {profile.photoURL ? (
                <Image src={profile.photoURL} alt={profile.fullName} fill sizes="48px" className="object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading font-semibold">{profile.fullName}</p>
              <p className="text-xs text-foreground/55">{t("myListings.roommateActive")}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/roommates/${profile.uid}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />{t("myListings.view")}
            </Link>
            <Link href="/profile" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{t("myListings.edit")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-foreground/60">{t("myListings.noRoommate")}</p>
          <Link href="/profile" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
            {t("myListings.edit")}
          </Link>
        </div>
      )}

      {/* Delete confirmation — deliberately a two-step action. */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t("myListings.deleteTitle")}>
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="font-heading text-lg font-semibold">{t("myListings.deleteTitle")}</h2>
            <p className="mt-2 text-sm text-foreground/70">{t("myListings.deleteBody")}</p>
            <p className="mt-1 truncate text-sm font-medium">{confirmDelete.title}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold"
              >
                {t("myListings.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void act(confirmDelete, "delete")}
                disabled={busyId === confirmDelete.id}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {busyId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t("myListings.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const STATUS_TONE: Record<MyListingStatus, string> = {
  published: "bg-success/15 text-success",
  pending: "bg-primary/15 text-primary",
  draft: "bg-highlight/20 text-foreground/70",
  archived: "bg-surface-muted text-foreground/60",
  rejected: "bg-destructive/15 text-destructive"
};

function ListingRow({
  listing,
  busy,
  locale,
  t,
  onAction,
  onDeleteRequest
}: {
  listing: Listing;
  busy: boolean;
  locale: string;
  t: (key: string) => string;
  onAction: (listing: Listing, action: "archive" | "unarchive" | "duplicate" | "delete") => void;
  onDeleteRequest: (listing: Listing) => void;
}) {
  const status = listingStatus(listing);
  const cover = listing.photoUrls[0];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative h-36 w-full bg-surface-muted">
        {cover ? (
          <Image src={cover} alt={listing.title} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" loading="lazy" />
        ) : null}
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[status]}`}>
          {t(`myListings.status.${status}`)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 break-words font-heading text-sm font-semibold">{listing.title}</h3>
        <p className="mt-1 text-xs text-foreground/55">
          {[listing.city, listing.district].filter(Boolean).join(", ")}
        </p>
        <p className="mt-1 text-sm font-semibold text-primary">
          {listing.monthlyRent == null
            ? t("listingDetail.priceNotSpecified")
            : formatCurrency(listing.monthlyRent)}
        </p>
        <dl className="mt-2 space-y-0.5 text-[11px] text-foreground/50">
          <div className="flex justify-between gap-2">
            <dt>{t("myListings.created")}</dt>
            <dd>{formatDate(listing.createdAt, locale)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{t("myListings.updated")}</dt>
            <dd>{formatDate(listing.updatedAt, locale)}</dd>
          </div>
        </dl>

        {/* Touch targets stay >= 40px on mobile. */}
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          <Link href={`/rooms/${listing.id}`} aria-label={`${t("myListings.view")} ${listing.title}`} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />{t("myListings.view")}
          </Link>
          <Link href={`/listings/${listing.id}/edit`} aria-label={`${t("myListings.edit")} ${listing.title}`} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{t("myListings.edit")}
          </Link>
          <button type="button" disabled={busy} onClick={() => onAction(listing, "duplicate")} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold disabled:opacity-60">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />{t("myListings.duplicate")}
          </button>
          <button type="button" disabled={busy} onClick={() => onAction(listing, listing.archived ? "unarchive" : "archive")} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold disabled:opacity-60">
            {listing.archived ? <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> : <Archive className="h-3.5 w-3.5" aria-hidden="true" />}
            {listing.archived ? t("myListings.unarchive") : t("myListings.archive")}
          </button>
          <button type="button" disabled={busy} onClick={() => onDeleteRequest(listing)} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-destructive/40 px-3 text-xs font-semibold text-destructive disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            {t("myListings.delete")}
          </button>
        </div>
      </div>
    </article>
  );
}
