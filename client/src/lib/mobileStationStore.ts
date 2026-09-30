export type MobileStation = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  website?: string | null;
  openingHours: string[];
  isOpen?: boolean | null;
  distanceLabel?: string | null;
  distanceMeters?: number | null;
  anpMatch?: {
    status: "probable" | "unresolved";
    confidence: number;
    legalName: string | null;
    brand: string | null;
    authorization: string | null;
  } | null;
};

const FAVORITES_KEY = "trajeto-mobile-station-favorites";
const MAX_FAVORITES = 20;
const CACHE_RETENTION_MS = 24 * 60 * 60 * 1000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function listMobileStationFavorites(): MobileStation[] {
  const value = readJson<unknown>(FAVORITES_KEY, []);
  return Array.isArray(value) ? value.filter(isMobileStation).slice(0, MAX_FAVORITES) : [];
}

export function isMobileStationFavorite(placeId: string) {
  return listMobileStationFavorites().some(station => station.placeId === placeId);
}

export function toggleMobileStationFavorite(station: MobileStation) {
  const current = listMobileStationFavorites();
  const exists = current.some(item => item.placeId === station.placeId);
  const next = exists
    ? current.filter(item => item.placeId !== station.placeId)
    : [station, ...current].slice(0, MAX_FAVORITES);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
  return { saved: !exists, stations: next };
}

function isMobileStation(value: unknown): value is MobileStation {
  if (!value || typeof value !== "object") return false;
  const station = value as Record<string, unknown>;
  return typeof station.placeId === "string" &&
    typeof station.name === "string" &&
    typeof station.address === "string" &&
    typeof station.lat === "number" &&
    typeof station.lng === "number" &&
    Array.isArray(station.openingHours);
}