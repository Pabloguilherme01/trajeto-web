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
  if (!isMobileStation(station)) return { saved: exists, stations: current, error: true };
  const next = exists
    ? current.filter(item => item.placeId !== station.placeId)
    : [station, ...current].slice(0, MAX_FAVORITES);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return { saved: !exists, stations: next, error: false };
  } catch {
    return { saved: exists, stations: current, error: true };
  }
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
  const match = all.filter(isStationCache).find(item =>
    item.query.trim().toLocaleLowerCase("pt-BR") === normalized &&
    (locationKey === "" ? item.lat == null && item.lng == null : item.lat != null && item.lng != null && `${item.lat.toFixed(4)},${item.lng.toFixed(4)}` === locationKey)
  );
  if (!match) return null;
  const age = Date.now() - Date.parse(match.savedAt);
  if (!Number.isFinite(age) || age < -300000 || age > CACHE_RETENTION_MS) return null;
  return { ...match, stations: match.stations.filter(isMobileStation).slice(0, MAX_CACHED) };
}

export function cacheStations(query: string, stations: MobileStation[], lat?: number, lng?: number) {
  const validStations = stations.filter(isMobileStation);
  if (validStations.length === 0) return;
  const all = readJson<unknown>(CACHE_KEY, []);
  const current = Array.isArray(all) ? all.filter(isStationCache) : [];
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const locationKey = lat != null && lng != null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : "";
  const next = [
    { query: query.trim(), lat, lng, savedAt: new Date().toISOString(), stations: validStations.slice(0, MAX_CACHED) },
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
    validCoordinate(station.lat, 90) &&
    validCoordinate(station.lng, 180) &&
    Array.isArray(station.openingHours) && station.openingHours.every(item => typeof item === "string");
}

function validCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

function isStationCache(value: unknown): value is StationCache {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.query === "string" && typeof item.savedAt === "string" && Array.isArray(item.stations) &&
    ((item.lat == null && item.lng == null) || (validCoordinate(item.lat, 90) && validCoordinate(item.lng, 180)));
}
