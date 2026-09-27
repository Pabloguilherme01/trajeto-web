const ECONOMY_KEY = "trajeto-mobile-economy";
const SEARCHES_KEY = "trajeto-recent-searches";

export function getEconomyMode() {
  try { return localStorage.getItem(ECONOMY_KEY) === "1"; } catch { return false; }
}

export function setEconomyMode(enabled: boolean) {
  try { localStorage.setItem(ECONOMY_KEY, enabled ? "1" : "0"); } catch {}
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
}
