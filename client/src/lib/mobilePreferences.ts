const ECONOMY_KEY = "trajeto-mobile-economy";
const SEARCHES_KEY = "trajeto-recent-searches";
const LAST_TRIP_KEY = "trajeto-last-trip";
const LAST_STATION_KEY = "trajeto-last-station";
const PREFERENCE_EVENT = "trajeto-preferences-change";

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

export function rememberTrip(origin: string, destination: string) {
  if (origin.trim().length < 3 || destination.trim().length < 3) return;
  try { localStorage.setItem(LAST_TRIP_KEY, JSON.stringify({ origin: origin.trim(), destination: destination.trim() })); } catch {}
  notifyPreferenceChange();
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
  notifyPreferenceChange();
}

export const mobilePreferenceEvent = PREFERENCE_EVENT;
