"use client";

import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Multi-photo input for admin forms: uploads through /api/upload (admin kind)
 * and manages an ordered list of URLs with per-photo remove.
 */
export function AdminPhotoList({
  value,
  onChange,
  onUploadingChange,
  max = 10
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Lets the parent disable its submit button while an upload is in flight. */
  onUploadingChange?: (uploading: boolean) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function setUploadingState(next: boolean) {
    setUploading(next);
    onUploadingChange?.(next);
  }

  async function handleFile(file: File) {
    setUploadingState(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "admin");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange([...value, json.url as string]);
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingState(false);
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((url, index) => (
            <div key={url} className="group relative h-16 w-24 overflow-hidden rounded-lg border border-border">
              <Image src={url} alt={`Photo ${index + 1}`} fill sizes="96px" className="object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow transition hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || value.length >= max}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
        {value.length >= max ? `Max ${max} photos` : "Upload photo"}
      </Button>
    </div>
  );
}
