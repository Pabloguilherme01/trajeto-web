const APP_PREFIX = "trajeto-";
const LOCAL_DATA_EVENT = "trajeto-local-data-cleared";

export function listLocalAppKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return Object.keys(window.localStorage).filter(key => key.startsWith(APP_PREFIX)).sort();
  } catch {
    return [];
  }
}

export function clearLocalAppData(): number {
  if (typeof window === "undefined") return 0;
  const keys = listLocalAppKeys();
  try {
    for (const key of keys) window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT));
  } catch {}
  return keys.length;
}

export const localDataEvent = LOCAL_DATA_EVENT;
