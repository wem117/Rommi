"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { UNIVERSITIES } from "@/lib/constants/universities";
import { getActiveUniversities } from "@/lib/data/universities";

const MAX_RESULTS = 8;
const FALLBACK_NAMES = UNIVERSITIES as readonly string[];

export function UniversityCombobox({
  value,
  onChange,
  placeholder = "Type to search universities...",
  id
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [names, setNames] = useState<string[]>(() => [...FALLBACK_NAMES]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Load the admin-managed university list from the database (falls back to the
  // built-in constant when Supabase is unconfigured or empty). "Other" is kept
  // as a free-text escape hatch.
  useEffect(() => {
    let cancelled = false;
    void getActiveUniversities().then((universities) => {
      if (cancelled || universities.length === 0) return;
      const dbNames = universities.map((u) => u.name);
      setNames([...dbNames, "Other"]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the visible text in sync when the committed value changes externally.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const matches = useMemo(
    () =>
      names
        .filter((university) => university.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, MAX_RESULTS),
    [names, query]
  );

  // Commit a selection. Called from onMouseDown so the choice registers on the
  // first press — before the input can blur or the dropdown can close, which is
  // what previously forced users to click a second time.
  function commit(university: string) {
    onChange(university);
    setQuery(university);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      commit(matches[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
          if (!event.target.value) onChange("");
        }}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        autoComplete="off"
      />
      {open && matches.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
        >
          {matches.map((university, index) => (
            <li key={university} id={`${listboxId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                // Commit on mousedown (before blur/close) so the first click always registers.
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(university);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`block w-full px-4 py-2 text-left text-sm transition ${
                  index === activeIndex ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-muted"
                }`}
              >
                {university}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default UniversityCombobox;
