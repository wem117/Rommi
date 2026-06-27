"use client";

import { AlertCircle, CheckCircle2, RefreshCcw } from "lucide-react";

export function StatusBanner({
  tone = "info",
  message,
  actionLabel,
  onAction
}: {
  tone?: "info" | "success" | "error";
  message?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!message) return null;

  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const toneClasses =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-[#e7dccd] bg-[#fbf6ef] text-[#7e5f4b]";

  return (
    <div
      aria-live="polite"
      className={`mb-5 flex items-start justify-between gap-3 rounded-[1.35rem] border px-4 py-3 text-sm ${toneClasses}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="leading-6">{message}</p>
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-current/15 bg-white/80 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
