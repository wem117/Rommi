"use client";

import { useEffect, useRef, useState } from "react";

import { UNIVERSITIES } from "@/lib/constants/universities";

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
  const containerRef = useRef<HTMLDivElement>(null);

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

  const matches = UNIVERSITIES.filter((university) =>
    university.toLowerCase().includes(query.trim().toLowerCase())
  ).slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value) onChange("");
        }}
        className="w-full rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm"
        autoComplete="off"
      />
      {open && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#eadfce] bg-white shadow-lg">
          {matches.map((university) => (
            <li key={university}>
              <button
                type="button"
                onClick={() => {
                  onChange(university);
                  setQuery(university);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-[#faf6ef]"
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
