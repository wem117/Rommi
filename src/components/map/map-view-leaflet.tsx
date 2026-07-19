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
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { MapMarker } from "@/components/map/map-view";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

// Airbnb/Krisha-style marker: a price pill when the listing has a price,
// otherwise a compact dot. Built as a divIcon so we never depend on Leaflet's
// default marker image assets (which break under bundlers). The selected pill
// inverts to the brand color and is lifted forward via zIndexOffset on the
// Marker so overlapping labels stay legible.
function priceIcon(marker: MapMarker, active: boolean) {
  const label = marker.price?.trim();

  if (!label) {
    const size = active ? 20 : 16;
    return L.divIcon({
      className: "roomi-map-dot",
      html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${
        active ? "#0f957d" : "#ffffff"
      };border:2px solid #0f957d;box-shadow:0 2px 6px rgba(31,22,10,.25);transition:all .15s"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  // Deterministic sizing so anchoring is exact without measuring the DOM.
  const width = Math.max(46, Math.round(label.length * 7.6) + 22);
  const height = 26;
  const bg = active ? "#0f957d" : "#ffffff";
  const color = active ? "#ffffff" : "#16110f";
  const border = active ? "#0f957d" : "#e4d9c8";

  return L.divIcon({
    className: "roomi-price-pill",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${width}px;height:${height}px;
      background:${bg};color:${color};border:1px solid ${border};border-radius:9999px;
      font:600 12px/1 Inter,system-ui,sans-serif;white-space:nowrap;
      box-shadow:0 4px 12px rgba(31,22,10,${active ? ".28" : ".16"});transition:all .15s;cursor:pointer">${escapeHtml(
        label
      )}</div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2]
  });
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
  onMarkerDragEnd
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
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={priceIcon(marker, marker.id === highlightId)}
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
