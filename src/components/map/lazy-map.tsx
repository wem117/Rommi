"use client";

import dynamic from "next/dynamic";

import type { MapMarker } from "@/components/map/map-view";

// The Google Maps JS API touches `window`, so the map must be client-only
// (no SSR). Lazily loaded so the Maps bundle — and the external API script —
// are only fetched on pages that actually render a map.
const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-surface-muted" />
});

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
