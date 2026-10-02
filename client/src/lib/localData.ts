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

  let cleared = clearPrivateLocationHandoff() ? 1 : 0;
  let failed = false;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[name];
      for (const key of listAppKeys(storage)) {
        try {
          storage.removeItem(key);
          cleared += 1;
        } catch {
          failed = true;
        }
      }
    } catch {
      failed = true;
    }
  }

  try {
    cleared += await clearOfflineRoutes();
  } catch {
    failed = true;
  }

  window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT));
  if (failed) throw new Error("Não foi possível apagar todos os dados neste navegador.");
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
