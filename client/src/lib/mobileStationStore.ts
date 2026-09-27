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
  anpMatch?: {
    status: "probable" | "unresolved";
    confidence: number;
    legalName: string | null;
    brand: string | null;
    authorization: string | null;
  } | null;
};

const FAVORITES_KEY = "trajeto-mobile-station-favorites";
const CACHE_KEY = "trajeto-mobile-station-cache";
const MAX_FAVORITES = 20;
const MAX_CACHED = 30;\nconst CACHE_RETENTION_MS = 24 * 60 * 60 * 1000;

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

export type StationCache = {
  query: string;
  lat?: number;
  lng?: number;
  savedAt: string;
  stations: MobileStation[];
};

export function getCachedStations(query: string, lat?: number, lng?: number): StationCache | null {
  const all = readJson<unknown>(CACHE_KEY, []);
  if (!Array.isArray(all)) return null;
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const locationKey = lat != null && lng != null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : "";
  const match = all.find(item =>
    item &&
    typeof item === "object" &&
    "query" in item &&
    typeof item.query === "string" &&
    item.query.trim().toLocaleLowerCase("pt-BR") === normalized &&
    (locationKey === "" ? item.lat == null && item.lng == null : item.lat != null && item.lng != null && `${item.lat.toFixed(4)},${item.lng.toFixed(4)}` === locationKey)
  ) as StationCache | undefined;
  if (!match || !Array.isArray(match.stations)) return null;\n  const savedAt = Date.parse(match.savedAt);\n  if (!Number.isFinite(savedAt) || Date.now() - savedAt > CACHE_RETENTION_MS) return null;\n  return match;
}

export function cacheStations(query: string, stations: MobileStation[], lat?: number, lng?: number) {
  if (stations.length === 0) return;
  const all = readJson<unknown>(CACHE_KEY, []);
  const current = Array.isArray(all) ? all.filter(item => item && typeof item === "object") as StationCache[] : [];
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const locationKey = lat != null && lng != null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : "";
  const next = [
    { query: query.trim(), lat, lng, savedAt: new Date().toISOString(), stations: stations.slice(0, MAX_CACHED) },
    ...current.filter(item => {
      const itemLocation = item.lat != null && item.lng != null ? `${item.lat.toFixed(4)},${item.lng.toFixed(4)}` : "";
      return !(item.query.trim().toLocaleLowerCase("pt-BR") === normalized && itemLocation === locationKey);
    }),
  ].slice(0, 5);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
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