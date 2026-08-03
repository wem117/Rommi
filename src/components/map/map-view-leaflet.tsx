"use client";

/*
 * Leaflet + OpenStreetMap map — the zero-configuration default. Used whenever
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set (lazy-map.tsx picks the
 * implementation at build time), so maps always work in production without any
 * API key or billing. Same props contract as the Google implementation.
 */

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { MapMarker } from "@/components/map/map-view";

// Standard red location pin (classic Google-Maps-style teardrop) for every
// listing — no floating price badges. Built as an inline-SVG divIcon so we
// never depend on Leaflet's default marker image assets (which break under
// bundlers). Anchored at the pin tip; the selected pin renders larger and is
// lifted forward via zIndexOffset on the Marker.
function pinIcon(active: boolean) {
  const size = active ? 44 : 34;
  return L.divIcon({
    className: "roomi-map-pin",
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"
      style="display:block;filter:drop-shadow(0 2px 4px rgba(31,22,10,.35));transition:all .15s;cursor:pointer">
      <path fill="#EA4335" stroke="#ffffff" stroke-width="1"
        d="M12 1.5C7.86 1.5 4.5 4.86 4.5 9c0 5.6 7.5 13.5 7.5 13.5S19.5 14.6 19.5 9c0-4.14-3.36-7.5-7.5-7.5z"/>
      <circle cx="12" cy="9" r="2.8" fill="#ffffff"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
}

/**
 * Turns a click anywhere on the map into a coordinate.
 *
 * Placing the pin by tapping the map is the whole point of the location picker:
 * dragging alone means a marker has to exist first, and address search was the
 * unreliable step being removed. Renders nothing — it exists only to subscribe
 * to the map's click event, which requires being inside <MapContainer>.
 */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => onMapClick(event.latlng.lat, event.latlng.lng)
  });
  return null;
}

// Flies to the highlighted marker (or fits all markers) when inputs change.
function MapController({
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

  useEffect(() => {
    const highlighted = highlightId ? markers.find((m) => m.id === highlightId) : undefined;
    if (highlighted) {
      map.flyTo([highlighted.lat, highlighted.lng], Math.max(zoom ?? 14, 15), { duration: 0.6 });
      return;
    }
    if (center) {
      map.setView(center, zoom ?? 13);
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], zoom ?? 14);
    } else if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, markers, highlightId, center, zoom]);

  return null;
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
  onMarkerDragEnd,
  onMapClick
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  highlightId?: string;
  className?: string;
  draggableId?: string;
  openLabel?: string;
  onMarkerClick?: (id: string) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  /** Click anywhere on the map to place/move the pin. */
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const fallbackCenter: [number, number] = center ?? (markers[0] ? [markers[0].lat, markers[0].lng] : [48.02, 66.92]);

  return (
    <MapContainer
      center={fallbackCenter}
      zoom={zoom ?? (markers.length ? 13 : 5)}
      scrollWheelZoom={false}
      className={className ?? "h-full w-full"}
      style={{ background: "#eef2f0" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController markers={markers} highlightId={highlightId} center={center} zoom={zoom} />
      {onMapClick ? <MapClickHandler onMapClick={onMapClick} /> : null}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={pinIcon(marker.id === highlightId)}
          // Bring the selected label forward so it isn't hidden by neighbours.
          zIndexOffset={marker.id === highlightId ? 1000 : 0}
          draggable={marker.id === draggableId}
          eventHandlers={{
            click: () => onMarkerClick?.(marker.id),
            dragend: (event) => {
              const pos = event.target.getLatLng();
              onMarkerDragEnd?.(pos.lat, pos.lng);
            }
          }}
        >
          {marker.title || marker.price ? (
            <Popup>
              <div className="w-52">
                {marker.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={marker.photo} alt={marker.title ?? ""} className="mb-2 h-24 w-full rounded-md object-cover" />
                ) : null}
                {marker.price ? <div className="text-sm font-bold text-[#0f957d]">{marker.price}</div> : null}
                {marker.title ? <div className="text-sm font-semibold text-[#16110f]">{marker.title}</div> : null}
                {marker.district || marker.university ? (
                  <div className="mt-0.5 text-xs text-[#6b5545]">
                    {[marker.district, marker.university].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                {marker.href ? (
                  <a
                    href={marker.href}
                    className="mt-2 inline-block rounded-full bg-[#0f957d] px-3 py-1 text-xs font-semibold text-white"
                  >
                    {openLabel}
                  </a>
                ) : null}
              </div>
            </Popup>
          ) : null}
        </Marker>
      ))}
    </MapContainer>
  );
}
