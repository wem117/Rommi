"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/context/locale-context";
import { localeOptions } from "@/lib/i18n";

export function LanguageMenu({ inverted = false }: { inverted?: boolean }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const current = localeOptions.find((option) => option.value === locale) ?? localeOptions[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition ${
          inverted
            ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "border-[#e6d8c6] bg-white text-[#2e2622] hover:bg-[#f8f2e8]"
        }`}
        aria-expanded={open}

      >
        <Languages className="h-4 w-4" />
        <span>{current.code}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className={`absolute right-0 top-[calc(100%+0.75rem)] z-40 w-72 rounded-[1.5rem] border p-3 shadow-2xl backdrop-blur ${
            inverted
              ? "border-white/10 bg-[rgba(17,16,12,0.9)] text-white"
              : "border-[#eadfce] bg-[#fffdf9] text-[#16110f]"
          }`}
        >

          <div className="grid gap-2">
            {localeOptions.map((option) => {
              const active = option.value === locale;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setLocale(option.value);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-[1.25rem] px-3 py-3 text-left transition ${
                    active
                      ? inverted
                        ? "bg-white/10"
                        : "bg-[#f5efe6]"
                      : inverted
                        ? "hover:bg-white/5"
                        : "hover:bg-[#faf4eb]"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{option.code}</div>
                    <div className={`text-xs ${inverted ? "text-white/70" : "text-[#7b6f64]"}`}>
                      {option.nativeLabel}
                    </div>
                  </div>

                  {active ? (
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full ${
                        inverted ? "bg-[#12b000] text-white" : "bg-[#12b000] text-white"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
