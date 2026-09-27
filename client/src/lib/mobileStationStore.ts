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
const MAX_CACHED = 30;

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
  savedAt: string;
  stations: MobileStation[];
};

export function getCachedStations(query: string): StationCache | null {
  const all = readJson<unknown>(CACHE_KEY, []);
  if (!Array.isArray(all)) return null;
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const match = all.find(item =>
    item &&
    typeof item === "object" &&
    "query" in item &&
    typeof item.query === "string" &&
    item.query.trim().toLocaleLowerCase("pt-BR") === normalized
  ) as StationCache | undefined;
  return match && Array.isArray(match.stations) ? match : null;
}

export function cacheStations(query: string, stations: MobileStation[]) {
  if (stations.length === 0) return;
  const all = readJson<unknown>(CACHE_KEY, []);
  const current = Array.isArray(all) ? all.filter(item => item && typeof item === "object") as StationCache[] : [];
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const next = [
    { query: query.trim(), savedAt: new Date().toISOString(), stations: stations.slice(0, MAX_CACHED) },
    ...current.filter(item => item.query.trim().toLocaleLowerCase("pt-BR") !== normalized),
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