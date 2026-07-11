"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

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

// Branded pin built as a divIcon so we never rely on Leaflet's default marker
// image assets (which break under bundlers).
function pinIcon(active: boolean) {
  const fill = active ? "#0a8d6e" : "#0f957d";
  const scale = active ? 1.15 : 1;
  return L.divIcon({
    className: "roomi-map-pin",
    html: `<div style="transform:translate(-50%,-100%) scale(${scale});transition:transform .15s">
      <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13 23.6 13.6 24.2a2 2 0 0 0 2.8 0C17 38.6 30 25.5 30 15 30 6.7 23.3 0 15 0Z" fill="${fill}"/>
        <circle cx="15" cy="15" r="6" fill="white"/>
      </svg>
    </div>`,
    iconSize: [30, 40],
    iconAnchor: [0, 0]
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
          icon={pinIcon(marker.id === highlightId)}
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
