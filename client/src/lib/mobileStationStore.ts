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

// Storage is shared with other tabs. Reuse parsed records only while the
// serialized snapshot is byte-for-byte unchanged; no stale values or TTLs.
type PreparedStationCache = { entry: StationCache; savedAtMs: number; stations: MobileStation[] };
type StationCacheSnapshot = {
  raw: string | null;
  entries: readonly StationCache[];
  byQuery: Map<string, Map<string, PreparedStationCache>> | null;
};
let stationCacheSnapshot: StationCacheSnapshot | null = null;
// A device's search origin is session-only; never persist its coordinates.
const sessionLocationCache = new Map<string, PreparedStationCache>();

function readStationCacheRecords(): StationCacheSnapshot | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(CACHE_KEY);
  } catch {
    // Storage access may fail (e.g. privacy mode); never reuse older results.
    stationCacheSnapshot = null;
    return null;
  }
  if (stationCacheSnapshot && stationCacheSnapshot.raw === raw) {
    return stationCacheSnapshot;
  }
  let entries: StationCache[] = [];
  try {
    const decoded: unknown = raw ? JSON.parse(raw) : null;
    const valid = Array.isArray(decoded) ? decoded.filter(isStationCache) : [];
    entries = valid.filter(entry => entry.lat == null && entry.lng == null);
    // Earlier releases persisted a device's search centre. Clear those records
    // on the first read, preserving generic public-station offline snapshots.
    if (entries.length !== valid.length) {
      try {
        raw = JSON.stringify(entries);
        localStorage.setItem(CACHE_KEY, raw);
      } catch {
        // Privacy-safe view is still enforced even if storage is blocked.
      }
    }
  } catch {
    // Even a malformed snapshot should only be parsed once until it changes.
  }
  stationCacheSnapshot = { raw, entries, byQuery: null };
  return stationCacheSnapshot;
}

function cacheLocationKey(lat?: number, lng?: number) {
  return lat != null && lng != null ? `${lat.toFixed(4)},${lng.toFixed(4)}` : "";
}

/** Prepare only on a cache read; writes keep their original records intact. */
function prepareStationCacheLookup(snapshot: StationCacheSnapshot) {
  if (snapshot.byQuery) return snapshot.byQuery;
  const byQuery = new Map<string, Map<string, PreparedStationCache>>();
  for (const entry of snapshot.entries) {
    const query = entry.query.trim().toLocaleLowerCase("pt-BR");
    let locations = byQuery.get(query);
    if (!locations) {
      locations = new Map();
      byQuery.set(query, locations);
    }
    const location = cacheLocationKey(entry.lat, entry.lng);
    // Preserve the first record chosen by the former Array.find lookup.
    if (locations.has(location)) continue;
    locations.set(location, {
      entry,
      savedAtMs: Date.parse(entry.savedAt),
      stations: entry.stations.filter(isMobileStation).slice(0, MAX_CACHED),
    });
  }
  snapshot.byQuery = byQuery;
  return byQuery;
}

export function getCachedStations(query: string, lat?: number, lng?: number): StationCache | null {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  let match: PreparedStationCache | undefined;
  if (lat != null || lng != null) {
    if (!validCoordinate(lat, 90) || !validCoordinate(lng, 180)) return null;
    match = sessionLocationCache.get(`${normalized}:${cacheLocationKey(lat, lng)}`);
  } else {
    const snapshot = readStationCacheRecords();
    if (!snapshot) return null;
    match = prepareStationCacheLookup(snapshot).get(normalized)?.get("");
  }
  if (!match) return null;
  // Retention remains a live check, even when the stored bytes do not change.
  const age = Date.now() - match.savedAtMs;
  if (!Number.isFinite(age) || age < -300000 || age > CACHE_RETENTION_MS) return null;
  return { ...match.entry, stations: match.stations.slice() };
}

export function cacheStations(query: string, stations: MobileStation[], lat?: number, lng?: number) {
  const validStations = stations.filter(isMobileStation);
  if (validStations.length === 0) return;
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const entry: StationCache = { query: query.trim(), savedAt: new Date().toISOString(), stations: validStations.slice(0, MAX_CACHED) };
  if (lat != null || lng != null) {
    if (!validCoordinate(lat, 90) || !validCoordinate(lng, 180)) return;
    const key = `${normalized}:${cacheLocationKey(lat, lng)}`;
    sessionLocationCache.delete(key);
    sessionLocationCache.set(key, { entry, savedAtMs: Date.parse(entry.savedAt), stations: entry.stations });
    if (sessionLocationCache.size > 5) sessionLocationCache.delete(sessionLocationCache.keys().next().value!);
    return;
  }
  const current = readStationCacheRecords()?.entries ?? [];
  const next = [entry, ...current.filter(item => item.query.trim().toLocaleLowerCase("pt-BR") !== normalized)].slice(0, 5);
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
