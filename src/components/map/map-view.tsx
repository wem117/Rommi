"use client";

import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  useMap,
  useMapsLibrary
} from "@vis.gl/react-google-maps";
import { MapPin, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  price?: string;
  district?: string;
  university?: string;
  photo?: string;
  href?: string;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Advanced Markers require a map ID; DEMO_MAP_ID is Google's documented
// default. Override with a styled map ID from the Cloud console when ready.
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

const KAZAKHSTAN_CENTER = { lat: 48.02, lng: 66.92 };

interface MapViewProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  highlightId?: string;
  className?: string;
  draggableId?: string;
  openLabel?: string;
  onMarkerClick?: (id: string) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
}

/** Teal count bubble used by the clusterer. */
function buildClusterContent(count: number) {
  const size = count < 10 ? 38 : count < 50 ? 44 : 50;
  const el = document.createElement("div");
  el.className =
    "roomi-marker-appear flex items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground shadow-lg ring-4 ring-primary/25 transition-transform duration-200 ease-out hover:scale-110";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.fontSize = count < 100 ? "14px" : "12px";
  el.style.cursor = "pointer";
  el.textContent = String(count);
  return el;
}

/**
 * Renders the price markers and keeps them registered with a MarkerClusterer
 * so dense areas collapse into count bubbles instead of overlapping labels.
 */
function ClusteredMarkers({
  markers,
  highlightId,
  draggableId,
  onSelect,
  onMarkerDragEnd
}: {
  markers: MapMarker[];
  highlightId?: string;
  draggableId?: string;
  onSelect: (id: string) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markerRefs, setMarkerRefs] = useState<Record<string, Marker>>({});

  useEffect(() => {
    if (!map || !markerLib || clusterer.current) return;
    clusterer.current = new MarkerClusterer({
      map,
      renderer: {
        render: ({ count, position }) =>
          new google.maps.marker.AdvancedMarkerElement({
            position,
            content: buildClusterContent(count),
            zIndex: 200 + count
          })
      }
    });
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current = null;
    };
  }, [map, markerLib]);

  useEffect(() => {
    const instance = clusterer.current;
    if (!instance) return;
    instance.clearMarkers();
    instance.addMarkers(Object.values(markerRefs));
  }, [markerRefs]);

  const setMarkerRef = useCallback((marker: Marker | null, id: string) => {
    setMarkerRefs((current) => {
      if (marker) {
        if (current[id] === marker) return current;
        return { ...current, [id]: marker };
      }
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  return (
    <>
      {markers.map((marker) => {
        const active = marker.id === highlightId;
        return (
          // No children → Google's standard red pin, anchored at its tip.
          // Clicking opens the listing preview card (handled by onSelect).
          <AdvancedMarker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            zIndex={active ? 1000 : undefined}
            draggable={marker.id === draggableId}
            ref={(ref) => setMarkerRef(ref, marker.id)}
            onClick={() => onSelect(marker.id)}
            onDragEnd={(event) => {
              const pos = event.latLng;
              if (pos) onMarkerDragEnd?.(pos.lat(), pos.lng());
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Frames the camera: smooth pan to the highlighted listing, otherwise an
 * explicit center, a single marker, or bounds fitted around all markers.
 */
function CameraController({
  markers,
  highlightId,
  center,
  zoom
}: {
  markers: MapMarker[];
  highlightId?: string;
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");
  const markersKey = useMemo(
    () => markers.map((m) => `${m.id}:${m.lat.toFixed(4)},${m.lng.toFixed(4)}`).join("|"),
    [markers]
  );

  useEffect(() => {
    if (!map || !highlightId) return;
    const target = markers.find((m) => m.id === highlightId);
    if (!target) return;
    if ((map.getZoom() ?? 0) < 15) map.setZoom(Math.max(zoom ?? 14, 15));
    map.panTo({ lat: target.lat, lng: target.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, highlightId]);

  useEffect(() => {
    if (!map || !coreLib || highlightId) return;
    if (center) {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom ?? 13);
      return;
    }
    if (markers.length === 1) {
      map.panTo({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(zoom ?? 14);
      return;
    }
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds, 56);
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      });
      return () => google.maps.event.removeListener(listener);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, coreLib, markersKey, center?.[0], center?.[1], zoom]);

  return null;
}

/** Floating preview card for the selected marker (Airbnb-style). */
function SelectedListingCard({ marker, openLabel, onClose }: { marker: MapMarker; openLabel: string; onClose: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div className="roomi-preview-appear pointer-events-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="relative">
          {marker.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={marker.photo} alt={marker.title ?? ""} className="h-32 w-full object-cover" />
          ) : (
            <div className="flex h-20 w-full items-center justify-center bg-surface-muted">
              <MapPin className="h-6 w-6 text-primary/60" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition hover:scale-110"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          {marker.price ? <p className="text-base font-bold text-primary">{marker.price}</p> : null}
          {marker.title ? <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-foreground">{marker.title}</p> : null}
          {marker.district || marker.university ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {[marker.district, marker.university].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {marker.href ? (
            <Link
              href={marker.href}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              {openLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Shown when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured. */
function MapUnavailable({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center bg-surface-muted ${className ?? "h-full w-full"}`}>
      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </span>
        <p className="text-sm font-semibold text-foreground">Map unavailable</p>
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          Set <code className="rounded bg-muted px-1 py-0.5 text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable
          the interactive map.
        </p>
      </div>
    </div>
  );
}

export default function MapView({
  markers,
  center,
  zoom,
  highlightId,
  className,
  draggableId,
  openLabel = "Open Listing",
  onMarkerClick,
  onMarkerDragEnd
}: MapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => markers.find((m) => m.id === selectedId), [markers, selectedId]);
  const fallbackCenter = center
    ? { lat: center[0], lng: center[1] }
    : markers[0]
      ? { lat: markers[0].lat, lng: markers[0].lng }
      : KAZAKHSTAN_CENTER;

  if (!GOOGLE_MAPS_API_KEY) {
    return <MapUnavailable className={className} />;
  }

  const handleSelect = (id: string) => {
    // The location-picker pin shouldn't open a preview card.
    if (id !== draggableId) setSelectedId(id);
    onMarkerClick?.(id);
  };

  return (
    <div className={`relative ${className ?? "h-full w-full"}`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={fallbackCenter}
          defaultZoom={zoom ?? (markers.length ? 13 : 5)}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          reuseMaps
          className="h-full w-full"
          onClick={() => setSelectedId(null)}
        >
          <CameraController markers={markers} highlightId={highlightId} center={center} zoom={zoom} />
          <ClusteredMarkers
            markers={markers}
            highlightId={selected ? selected.id : highlightId}
            draggableId={draggableId}
            onSelect={handleSelect}
            onMarkerDragEnd={onMarkerDragEnd}
          />
        </GoogleMap>
      </APIProvider>
      {selected ? (
        <SelectedListingCard marker={selected} openLabel={openLabel} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
