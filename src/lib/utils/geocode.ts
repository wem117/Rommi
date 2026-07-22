/**
 * Address search + reverse geocoding via OpenStreetMap Nominatim (free, no API
 * key). The browser's Referer header identifies the app per Nominatim's usage
 * policy, and callers debounce to respect the ~1 req/sec limit.
 *
 * PRODUCTION NOTE: Nominatim's public endpoint is rate-limited and not meant
 * for heavy traffic. For scale, switch NEXT_PUBLIC_GEOCODER_URL to a paid
 * geocoder (Mapbox / Google / LocationIQ) or a self-hosted Nominatim; this
 * module reads that base URL if provided and otherwise falls back to the public
 * endpoint.
 */

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

const NOMINATIM_BASE =
  process.env.NEXT_PUBLIC_GEOCODER_URL?.replace(/\/$/, "") ?? "https://nominatim.openstreetmap.org";

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "kz");

  try {
    const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return data
      .map((d) => ({ displayName: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }))
      .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");

  try {
    const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
