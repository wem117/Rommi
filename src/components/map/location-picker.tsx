"use client";

import { MapPin, X } from "lucide-react";

import { LazyMap } from "@/components/map/lazy-map";

/**
 * Location selection for listing creation.
 *
 * Replaces the address-search flow. Geocoding Kazakhstan through Nominatim was
 * the unreliable step — no residential complexes (ЖК), weak building coverage,
 * and no apartment-level results — so a listing's coordinates depended on a
 * lookup that frequently returned nothing. The evidence is in the data: ZERO of
 * the listings created under that flow have coordinates stored.
 *
 * Dropping a pin removes the lookup entirely. The person publishing knows where
 * the property is; they just need to point at it. Coordinates are then exact by
 * construction rather than approximated from a string.
 *
 * The address becomes free text and is never validated against a geocoder, so
 * "ЖК Ауэзов Сити, 3 подъезд" or "напротив КБТУ" are saved exactly as typed
 * instead of being rejected for not resolving.
 *
 * The map is lazy-loaded (LazyMap → next/dynamic, ssr:false), so no map
 * JavaScript is downloaded until this step is reached.
 */

/** Almaty city centre — where the map opens before a pin exists. */
const DEFAULT_CENTER: [number, number] = [43.238949, 76.889709];

export function LocationPicker({
  lat,
  lng,
  onCoordsChange,
  address,
  onAddressChange,
  labels,
  showAddressField = true
}: {
  lat: number | null;
  lng: number | null;
  onCoordsChange: (lat: number | null, lng: number | null) => void;
  address: string;
  onAddressChange: (value: string) => void;
  /** Admin forms already render their own address input; map-only there. */
  showAddressField?: boolean;
  labels: {
    mapLabel: string;
    mapHint: string;
    selected: string;
    notSelected: string;
    clear: string;
    addressLabel: string;
    addressHint: string;
    addressPlaceholder: string;
  };
}) {
  const hasPin = lat != null && lng != null;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-foreground">
          {labels.mapLabel} <span className="text-destructive">*</span>
        </label>
        <p className="mt-1 text-xs text-foreground/55">{labels.mapHint}</p>

        <div className="mt-2 overflow-hidden rounded-2xl border border-border">
          <div className="h-[280px] w-full sm:h-[340px]">
            <LazyMap
              markers={
                hasPin
                  ? [{ id: "picked", lat: lat as number, lng: lng as number, title: labels.selected }]
                  : []
              }
              center={hasPin ? [lat as number, lng as number] : DEFAULT_CENTER}
              zoom={hasPin ? 16 : 12}
              highlightId="picked"
              // Both gestures set the same coordinate: tap to place, drag to
              // fine-tune. Neither depends on a geocoder being reachable.
              draggableId="picked"
              onMapClick={(nextLat, nextLng) => onCoordsChange(nextLat, nextLng)}
              onMarkerDragEnd={(nextLat, nextLng) => onCoordsChange(nextLat, nextLng)}
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {hasPin ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {labels.selected}: {(lat as number).toFixed(5)}, {(lng as number).toFixed(5)}
              </span>
              <button
                type="button"
                onClick={() => onCoordsChange(null, null)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium text-foreground/70 transition hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                {labels.clear}
              </button>
            </>
          ) : (
            <span className="text-foreground/55">{labels.notSelected}</span>
          )}
        </div>
      </div>

      {showAddressField ? (
      <div>
        <label htmlFor="address" className="text-sm font-semibold text-foreground">
          {labels.addressLabel}
        </label>
        <p className="mt-1 text-xs text-foreground/55">{labels.addressHint}</p>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          placeholder={labels.addressPlaceholder}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
        />
      </div>
      ) : null}
    </div>
  );
}
