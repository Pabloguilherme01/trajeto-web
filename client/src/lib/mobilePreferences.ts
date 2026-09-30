const ECONOMY_KEY = "trajeto-mobile-economy";
const SEARCHES_KEY = "trajeto-recent-searches";
const LAST_TRIP_KEY = "trajeto-last-trip";
const RECENT_TRIPS_KEY = "trajeto-recent-trips";
const MAX_RECENT_TRIPS = 8;
const ROUTE_USAGE_KEY = "trajeto-route-usage";
const ROUTE_USAGE_EVENTS_KEY = "trajeto-route-usage-events";
const LAST_STATION_KEY = "trajeto-last-station";
const LAST_INTENT_KEY = "trajeto-last-intent";
const PREFERENCE_EVENT = "trajeto-preferences-change";

export type MobileIntent = "route" | "stations" | "nearby" | "saved" | "search";

function notifyPreferenceChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT));
}

export function getEconomyMode() {
  try {
    const saved = localStorage.getItem(ECONOMY_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return Boolean(connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g");
  } catch { return false; }
}

export function setEconomyMode(enabled: boolean) {
  try { localStorage.setItem(ECONOMY_KEY, enabled ? "1" : "0"); } catch {}
  notifyPreferenceChange();
}

export function getRecentSearches(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(SEARCHES_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
  } catch { return []; }
}

export function rememberSearch(query: string) {
  const normalized = query.trim();
  if (normalized.length < 3) return;
  try {
    const next = [normalized, ...getRecentSearches().filter(item => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
    localStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
  } catch {}
  notifyPreferenceChange();
}

export function getLastTrip(): { origin: string; destination: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_TRIP_KEY) || "null");
    return value && typeof value.origin === "string" && typeof value.destination === "string" ? value : null;
  } catch { return null; }
}

export type RecentTrip = { origin: string; destination: string; usedAt: string };

function isRecentTrip(value: unknown): value is RecentTrip {
  return Boolean(
    value && typeof value === "object" &&
    typeof (value as RecentTrip).origin === "string" && (value as RecentTrip).origin.trim().length >= 3 &&
    typeof (value as RecentTrip).destination === "string" && (value as RecentTrip).destination.trim().length >= 3 &&
    typeof (value as RecentTrip).usedAt === "string" && Number.isFinite(Date.parse((value as RecentTrip).usedAt)),
  );
}

export function getRecentTrips(): RecentTrip[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_TRIPS_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isRecentTrip).sort((a, b) => Date.parse(b.usedAt) - Date.parse(a.usedAt)).slice(0, MAX_RECENT_TRIPS);
  } catch { return []; }
}

export function removeRecentTrip(origin: string, destination: string) {
  const normalizedOrigin = origin.trim().toLocaleLowerCase("pt-BR");
  const normalizedDestination = destination.trim().toLocaleLowerCase("pt-BR");
  try {
    const next = getRecentTrips().filter(item =>
      item.origin.trim().toLocaleLowerCase("pt-BR") !== normalizedOrigin ||
      item.destination.trim().toLocaleLowerCase("pt-BR") !== normalizedDestination,
    );
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(next));
  } catch {}
  notifyPreferenceChange();
}

export function clearRecentTrips() {
  try { localStorage.removeItem(RECENT_TRIPS_KEY); } catch {}
  notifyPreferenceChange();
}

export function getRouteUsageTrend(origin: string, destination: string, days = 30) {
  const usage = getRouteUsage(origin, destination);
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  return { total: usage, averagePerDay: usage / safeDays, windowDays: safeDays };
}

export function getMostUsedRoute(): RecentTrip | null {
  const trips = getRecentTrips();
  if (!trips.length) return null;
  return trips.reduce((best, trip) =>
    getRouteUsage(trip.origin, trip.destination) > getRouteUsage(best.origin, best.destination) ? trip : best,
  trips[0]);
}

export type RouteUsageStats = {
  total: number;
  recordedEvents: number;
  windowDays: number;
  averagePerDay: number | null;
};

export function getRouteUsageStats(origin: string, destination: string, days = 30): RouteUsageStats {
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const key = origin.trim().toLocaleLowerCase("pt-BR") + "::" + destination.trim().toLocaleLowerCase("pt-BR");
  try {
    const raw = JSON.parse(localStorage.getItem(ROUTE_USAGE_EVENTS_KEY) || "{}");
    const events = raw && typeof raw === "object" && Array.isArray(raw[key]) ? raw[key] : [];
    const cutoff = Date.now() - safeDays * 24 * 60 * 60 * 1000;
    const recent = events.filter((value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) >= cutoff);
    return {
      total: getRouteUsage(origin, destination),
      recordedEvents: recent.length,
      windowDays: safeDays,
      averagePerDay: recent.length ? recent.length / safeDays : null,
    };
  } catch {
    return { total: getRouteUsage(origin, destination), recordedEvents: 0, windowDays: safeDays, averagePerDay: null };
  }
}

export function getRouteUsage(origin: string, destination: string) {
  const key = origin.trim().toLocaleLowerCase("pt-BR") + "::" + destination.trim().toLocaleLowerCase("pt-BR");
  try {
    const value = JSON.parse(localStorage.getItem(ROUTE_USAGE_KEY) || "{}");
    return value && typeof value === "object" && Number.isFinite(Number(value[key])) ? Number(value[key]) : 0;
  } catch { return 0; }
}

export function rememberTrip(origin: string, destination: string) {
  const normalizedOrigin = origin.trim();
  const normalizedDestination = destination.trim();
  if (normalizedOrigin.length < 3 || normalizedDestination.length < 3) return;
  const trip: RecentTrip = { origin: normalizedOrigin, destination: normalizedDestination, usedAt: new Date().toISOString() };
  try {
    const next = [trip, ...getRecentTrips().filter(item =>
      item.origin.trim().toLocaleLowerCase("pt-BR") !== normalizedOrigin.toLocaleLowerCase("pt-BR") ||
      item.destination.trim().toLocaleLowerCase("pt-BR") !== normalizedDestination.toLocaleLowerCase("pt-BR"),
    )].slice(0, MAX_RECENT_TRIPS);
    localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(next));
    const usageKey = normalizedOrigin.toLocaleLowerCase("pt-BR") + "::" + normalizedDestination.toLocaleLowerCase("pt-BR");
    const usage = JSON.parse(localStorage.getItem(ROUTE_USAGE_KEY) || "{}");
    usage[usageKey] = Number.isFinite(Number(usage[usageKey])) ? Number(usage[usageKey]) + 1 : 1;
    localStorage.setItem(ROUTE_USAGE_KEY, JSON.stringify(usage));
    const events = JSON.parse(localStorage.getItem(ROUTE_USAGE_EVENTS_KEY) || "{}");
    const currentEvents = Array.isArray(events[usageKey]) ? events[usageKey].filter((value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value))) : [];
    events[usageKey] = [...currentEvents, trip.usedAt].slice(-200);
    localStorage.setItem(ROUTE_USAGE_EVENTS_KEY, JSON.stringify(events));
    localStorage.setItem(LAST_TRIP_KEY, JSON.stringify({ origin: normalizedOrigin, destination: normalizedDestination }));
  } catch {}
  rememberIntent("route");
}

export type LastStation = { placeId: string; name: string; address: string; query: string };

export function getLastStation(): LastStation | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_STATION_KEY) || "null");
    return value && typeof value.placeId === "string" && typeof value.name === "string" && typeof value.address === "string" && typeof value.query === "string"
      ? value
      : null;
  } catch { return null; }
}

export function rememberStation(station: LastStation) {
  if (!station.placeId || station.name.trim().length < 2 || station.address.trim().length < 2) return;
  try {
    localStorage.setItem(LAST_STATION_KEY, JSON.stringify({
      placeId: station.placeId,
      name: station.name.trim(),
      address: station.address.trim(),
      query: station.query.trim(),
    }));
  } catch {}
  rememberIntent("stations");
}

export function getLastIntent(): MobileIntent | null {
  try {
    const value = localStorage.getItem(LAST_INTENT_KEY);
    return value === "route" || value === "stations" || value === "nearby" || value === "saved" || value === "search" ? value : null;
  } catch { return null; }
}

export function rememberIntent(intent: MobileIntent) {
  try { localStorage.setItem(LAST_INTENT_KEY, intent); } catch {}
  notifyPreferenceChange();
}

export const mobilePreferenceEvent = PREFERENCE_EVENT;
