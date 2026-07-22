"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LazyMap } from "@/components/map/lazy-map";
import { reverseGeocode, searchAddress, type GeocodeResult } from "@/lib/utils/geocode";

/**
 * Address input with type-ahead geocoding (Nominatim) and a live map preview
 * with a draggable pin. Selecting a suggestion or dragging the pin updates both
 * the address text and the saved lat/lng.
 */
export function AddressAutocomplete({
  address,
  onAddressChange,
  lat,
  lng,
  onCoordsChange,
  placeholder,
  dragHint
}: {
  address: string;
  onAddressChange: (value: string) => void;
  lat: number | null;
  lng: number | null;
  onCoordsChange: (lat: number, lng: number) => void;
  placeholder?: string;
  dragHint?: string;
}) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  // Debounced address search.
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = address.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      void searchAddress(q, controller.signal).then((res) => {
        setResults(res);
        setSearching(false);
        if (res.length) setOpen(true);
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectResult(result: GeocodeResult) {
    skipNextSearch.current = true;
    onAddressChange(result.displayName);
    onCoordsChange(result.lat, result.lng);
    setResults([]);
    setOpen(false);
  }

  function handleDragEnd(nextLat: number, nextLng: number) {
    onCoordsChange(nextLat, nextLng);
    // Refresh the address text to match the dragged pin (best-effort).
    void reverseGeocode(nextLat, nextLng).then((name) => {
      if (name) {
        skipNextSearch.current = true;
        onAddressChange(name);
      }
    });
  }

  const hasCoords = lat != null && lng != null;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
        <input
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/40" />
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {results.map((result) => (
            <li key={`${result.lat}-${result.lng}-${result.displayName}`}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectResult(result);
                }}
                className="block w-full px-4 py-2 text-left text-xs leading-5 text-foreground transition hover:bg-surface-muted"
              >
                {result.displayName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hasCoords ? (
        <div className="mt-3">
          <div className="h-56 overflow-hidden rounded-2xl border border-border">
            <LazyMap
              markers={[{ id: "listing", lat: lat!, lng: lng!, title: address }]}
              draggableId="listing"
              zoom={15}
              onMarkerDragEnd={handleDragEnd}
            />
          </div>
          {dragHint ? <p className="mt-2 text-xs text-foreground/50">{dragHint}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
