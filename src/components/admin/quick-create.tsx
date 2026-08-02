"use client";

import { ChevronRight, ClipboardPaste, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyExtraction, extractFromPost } from "@/lib/utils/post-parser";

/**
 * The pieces the two admin quick-create forms share.
 *
 * The workflow they serve is: read a post in Telegram, copy it, paste it here,
 * glance at what was filled in, publish. Everything below is shaped by that —
 * the paste box comes first because pasting is the first thing that happens,
 * the four fields that cannot be defaulted come next, and every field that CAN
 * be defaulted is behind a disclosure so it is available without being in the
 * way.
 */

/** Section that starts closed. Optional detail should be reachable, not present. */
export function CollapsibleSection({
  title,
  hint,
  icon,
  children,
  defaultOpen = false
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group rounded-xl border border-border bg-surface-muted/30 open:bg-surface-muted/50" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-foreground/50 transition-transform group-open:rotate-90" />
        {icon}
        <span>{title}</span>
        {hint ? <span className="ml-auto text-xs font-normal text-foreground/50">{hint}</span> : null}
      </summary>
      <div className="border-t border-border/70 px-4 py-4">{children}</div>
    </details>
  );
}

export interface ContactValues {
  phone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
}

export const EMPTY_CONTACTS: ContactValues = { phone: "", whatsapp: "", telegram: "", instagram: "" };

/**
 * The four ways a landlord or roommate can be reached, all optional.
 *
 * Posts carry whichever the author happened to use, so none can be required and
 * all four have to be here — asking the admin to shoehorn an Instagram handle
 * into a "Telegram" box is how contact data gets lost.
 */
export function ContactFields({
  idPrefix,
  value,
  onChange
}: {
  idPrefix: string;
  value: ContactValues;
  onChange: (next: ContactValues) => void;
}) {
  const fields: Array<{ key: keyof ContactValues; label: string; placeholder: string }> = [
    { key: "phone", label: "Phone", placeholder: "+7 700 123 45 67" },
    { key: "whatsapp", label: "WhatsApp", placeholder: "+7 700 123 45 67" },
    { key: "telegram", label: "Telegram", placeholder: "@username" },
    { key: "instagram", label: "Instagram", placeholder: "@username" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${field.key}`} className="text-xs font-medium text-foreground/70">
            {field.label}
          </Label>
          <Input
            id={`${idPrefix}-${field.key}`}
            value={value[field.key]}
            placeholder={field.placeholder}
            onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

/** Human-readable names for the "filled in" hint. */
const FIELD_LABELS: Record<string, string> = {
  phone: "phone",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  monthlyRent: "rent",
  maxBudget: "budget",
  genderPreference: "gender",
  gender: "gender",
  availableFrom: "move-in date",
  preferredMoveInDate: "move-in date"
};

/**
 * The paste box: the description field and the extraction trigger in one.
 *
 * Extraction runs automatically a short moment after the text stops changing,
 * so the admin never has to press an "extract" button — but only when the text
 * has actually changed since the last scan. Without that guard, clearing a
 * wrongly-extracted phone number would see it reappear on the next keystroke.
 *
 * `onExtract` receives the parsed fields and decides what to do with them; it
 * must fill blanks only (see `applyExtraction`), so the admin's own edits always
 * survive.
 */
export function PastePostBox({
  id,
  label,
  value,
  placeholder,
  onChange,
  onExtract,
  rows = 6
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
  onExtract: (extracted: ReturnType<typeof extractFromPost>) => string[];
  rows?: number;
}) {
  const [filled, setFilled] = useState<string[]>([]);
  const lastScanned = useRef("");

  useEffect(() => {
    const text = value.trim();
    if (!text || text === lastScanned.current) return;

    const timer = setTimeout(() => {
      lastScanned.current = text;
      const names = onExtract(extractFromPost(text));
      if (names.length) setFilled(names);
    }, 400);

    return () => clearTimeout(timer);
    // `onExtract` is redefined every render by the parent; depending on it would
    // re-run the scan on every keystroke and defeat the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <ClipboardPaste className="h-4 w-4 text-primary" />
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
      </div>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {filled.length ? (
        <p className="flex items-start gap-1.5 text-xs text-success">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Filled in from the post: {filled.map((f) => FIELD_LABELS[f] ?? f).join(", ")}. Check them before publishing.
          </span>
        </p>
      ) : (
        <p className="text-xs text-foreground/50">
          Paste the original post — phone, WhatsApp, Telegram, Instagram, price, gender and move-in date are read out of
          it automatically.
        </p>
      )}
    </div>
  );
}

/** Marks the block whose contents never reach a public page. */
export function InternalBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
      <Lock className="h-3 w-3" />
      Never public
    </span>
  );
}

export { applyExtraction };
