"use client";

import dynamic from "next/dynamic";

import type { MapMarker } from "@/components/map/map-view";

// Both map libraries touch `window`, so the map must be client-only (no SSR),
// and it's lazily loaded so the map bundle is only fetched on pages that
// actually render one.
//
// Implementation is chosen at build time from the env (NEXT_PUBLIC_* vars are
// inlined by Next): with a Google Maps API key configured we use the Google
// implementation (clustering, vector map); without one we fall back to
// Leaflet + OpenStreetMap, which needs no key or billing and always works in
// production. Only the selected implementation's chunk is ever downloaded.
const HAS_GOOGLE_MAPS_KEY = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

const MapView = dynamic(
  () => (HAS_GOOGLE_MAPS_KEY ? import("@/components/map/map-view") : import("@/components/map/map-view-leaflet")),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-surface-muted" />
  }
);

export type { MapMarker };

export function LazyMap(props: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  highlightId?: string;
  className?: string;
  draggableId?: string;
  openLabel?: string;
  onMarkerClick?: (id: string) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
}) {
  return <MapView {...props} />;
}
