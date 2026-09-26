const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 100;
const stationSearchCache = new Map<string, { expiresAt: number; value: unknown }>();

function cacheKey(query: string) {
  return query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function getCachedStationSearch<T>(query: string, now = Date.now()): T | null {
  const key = cacheKey(query);
  const cached = stationSearchCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    stationSearchCache.delete(key);
    return null;
  }
  return cached.value as T;
}

export function cacheStationSearch<T>(query: string, value: T, now = Date.now()) {
  const key = cacheKey(query);
  stationSearchCache.delete(key);
  stationSearchCache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  while (stationSearchCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = stationSearchCache.keys().next().value;
    if (oldestKey === undefined) break;
    stationSearchCache.delete(oldestKey);
  }
  return value;
}

export function clearStationSearchCache() {
  stationSearchCache.clear();
}
