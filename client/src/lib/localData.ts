import { clearOfflineRoutes, countOfflineRoutes } from "@/lib/offlineStore";
import { clearPrivateLocationHandoff } from "@/lib/locationPrivacy";

const APP_PREFIXES = ["trajeto-", "trajeto:"];
const LOCAL_DATA_EVENT = "trajeto-local-data-cleared";

function listAppKeys(storage: Storage): string[] {
  return Object.keys(storage)
    .filter(key => APP_PREFIXES.some(prefix => key.startsWith(prefix)))
    .sort();
}

export function listLocalAppKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return listAppKeys(window.localStorage);
  } catch {
    return [];
  }
}

export function listSessionAppKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return listAppKeys(window.sessionStorage);
  } catch {
    return [];
  }
}

export async function countLocalAppData(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const localCount = listLocalAppKeys().length;
  const sessionCount = listSessionAppKeys().length;
  let offlineCount = 0;
  try {
    offlineCount = await countOfflineRoutes();
  } catch {}
  return localCount + sessionCount + offlineCount;
}

export async function clearLocalAppData(): Promise<number> {
  if (typeof window === "undefined") return 0;

  let cleared = 0;
  for (const [storage, keys] of [
    [window.localStorage, listLocalAppKeys()],
    [window.sessionStorage, listSessionAppKeys()],
  ] as const) {
    try {
      for (const key of keys) {
        storage.removeItem(key);
        cleared += 1;
      }
    } catch {}
  }

  try {
    cleared += await clearOfflineRoutes();
  } catch {}
  if (clearPrivateLocationHandoff()) cleared += 1;

  try {
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT));
  } catch {}
  return cleared;
}

export const localDataEvent = LOCAL_DATA_EVENT;

export function exportLocalAppData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data: Record<string, string> = {};
    for (const key of listLocalAppKeys()) {
      const value = window.localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }
    const blob = new Blob([JSON.stringify({
      app: "Trajeto",
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trajeto-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
