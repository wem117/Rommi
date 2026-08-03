"use client";

import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { deleteImageByUrl, uploadImageFile, validateImageFile } from "@/lib/supabase/storage";
import { friendlySupabaseError } from "@/lib/utils/errors";

/**
 * Multi-file image uploader: select or drop several at once, uploaded
 * concurrently with per-file progress and previews.
 *
 * ORDER. Uploads finish out of order — a 4 MB photo lands after a 200 KB one —
 * so results are written into a fixed slot array by their original index and
 * only flattened once the batch settles. Appending on completion would have
 * silently reshuffled a listing's photos, and the first photo is the cover.
 *
 * CONCURRENCY is capped. Ten parallel multi-megabyte uploads on a phone
 * connection make every one of them slower and time out more often; a small
 * window keeps the pipe busy without that.
 *
 * REMOVAL DURING UPLOAD. A file removed mid-flight is marked cancelled rather
 * than cut off: when its request lands, the stored object is deleted and the URL
 * is dropped. Aborting the request would leave the object in the bucket with
 * nothing referencing it.
 *
 * Optimization, compression, lazy loading and storage layout are untouched —
 * every file still goes through the same `/api/upload` route, which does the
 * magic-byte verification and path construction.
 */

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error" | "cancelled";
  url?: string;
  error?: string;
};

const CONCURRENCY = 3;

export function MultiImageUploader({
  value,
  onChange,
  kind,
  max = 10,
  onUploadingChange,
  labels,
  variant = "grid"
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  kind: "listings" | "admin" | "avatars" | "messages";
  max?: number;
  onUploadingChange?: (uploading: boolean) => void;
  labels: {
    add: string;
    empty: string;
    remove: string;
    maxReached: string;
    dropHint: string;
    alt: string;
  };
  variant?: "grid" | "compact";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const cancelledRef = useRef<Set<string>>(new Set());

  const uploading = items.some((i) => i.status === "pending" || i.status === "uploading");

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  // Object URLs are leaked memory until revoked.
  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      const files = Array.from(fileList ?? []);
      if (!files.length) return;

      const remaining = max - value.length - items.filter((i) => i.status !== "cancelled" && i.status !== "error").length;
      if (remaining <= 0) {
        toast.error(labels.maxReached);
        return;
      }
      const accepted = files.slice(0, remaining);
      if (accepted.length < files.length) toast.error(labels.maxReached);

      // Validate up front so one bad file does not half-upload a batch.
      const invalid = accepted.map(validateImageFile).find(Boolean);
      if (invalid) {
        toast.error(invalid);
        return;
      }

      const batch: Item[] = accepted.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "pending"
      }));
      setItems((current) => [...current, ...batch]);

      const slots: (string | null)[] = new Array(batch.length).fill(null);
      let cursor = 0;

      async function worker() {
        for (;;) {
          const index = cursor++;
          if (index >= batch.length) return;
          const item = batch[index];

          setItems((current) =>
            current.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i))
          );

          try {
            const result = await uploadImageFile({
              file: item.file,
              kind,
              onProgress: (progress) =>
                setItems((current) =>
                  current.map((i) => (i.id === item.id ? { ...i, progress } : i))
                )
            });

            if (cancelledRef.current.has(item.id)) {
              // Removed while in flight — do not orphan the stored object.
              await deleteImageByUrl(result.url).catch(() => undefined);
              cancelledRef.current.delete(item.id);
              continue;
            }

            slots[index] = result.url;
            setItems((current) =>
              current.map((i) =>
                i.id === item.id ? { ...i, status: "done", progress: 100, url: result.url } : i
              )
            );
          } catch (error) {
            const message = friendlySupabaseError(error, "Upload failed");
            setItems((current) =>
              current.map((i) => (i.id === item.id ? { ...i, status: "error", error: message } : i))
            );
            toast.error(message);
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker));

      const uploaded = slots.filter((u): u is string => Boolean(u));
      if (uploaded.length) onChange([...value, ...uploaded]);

      // Successful previews are replaced by the real image; keep failures so the
      // person can see which file did not make it.
      setItems((current) => {
        current.filter((i) => i.status === "done").forEach((i) => URL.revokeObjectURL(i.previewUrl));
        return current.filter((i) => i.status === "error");
      });
    },
    [items, kind, labels.maxReached, max, onChange, value]
  );

  function removePending(item: Item) {
    if (item.status === "uploading" || item.status === "pending") {
      cancelledRef.current.add(item.id);
    }
    URL.revokeObjectURL(item.previewUrl);
    setItems((current) => current.filter((i) => i.id !== item.id));
  }

  async function removeUploaded(url: string) {
    onChange(value.filter((item) => item !== url));
    await deleteImageByUrl(url).catch(() => undefined);
  }

  const atMax = value.length >= max;
  const tile = variant === "compact" ? "h-16 w-24" : "aspect-square";

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void addFiles(event.dataTransfer.files);
      }}
      className={dragging ? "rounded-2xl ring-2 ring-primary ring-offset-2" : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {value.length || items.length ? (
        <div
          className={
            variant === "compact"
              ? "flex flex-wrap gap-2"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
          }
        >
          {value.map((url, index) => (
            <div
              key={url}
              className={`group relative ${tile} overflow-hidden rounded-2xl border border-border bg-background`}
            >
              <Image src={url} alt={`${labels.alt} ${index + 1}`} fill sizes="160px" className="object-cover" />
              <button
                type="button"
                onClick={() => void removeUploaded(url)}
                aria-label={`${labels.remove} ${index + 1}`}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-destructive shadow"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                  1
                </span>
              ) : null}
            </div>
          ))}

          {items.map((item) => (
            <div
              key={item.id}
              className={`relative ${tile} overflow-hidden rounded-2xl border border-border bg-background`}
            >
              {/* Local preview, shown before the upload finishes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 grid place-items-center bg-black/35">
                {item.status === "error" ? (
                  <span className="px-1 text-center text-[10px] font-semibold text-white">!</span>
                ) : (
                  <span className="text-xs font-semibold text-white">{item.progress}%</span>
                )}
              </div>
              <div
                className="absolute bottom-0 left-0 h-1 bg-primary transition-all"
                style={{ width: `${item.progress}%` }}
              />
              <button
                type="button"
                onClick={() => removePending(item)}
                aria-label={`${labels.remove} ${item.file.name}`}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-foreground shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-foreground/55">
          {labels.empty}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || atMax}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {atMax ? labels.maxReached : labels.add}
        </button>
        <span className="text-xs text-foreground/55">{labels.dropHint}</span>
      </div>
    </div>
  );
}
