import { clearPrivateLocationHandoff } from "./locationPrivacy";

const APP_PREFIXES = ["trajeto-", "trajeto:"];
const LOCAL_DATA_EVENT = "trajeto-local-data-cleared";

export function listLocalAppKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return Object.keys(window.localStorage).filter(key => APP_PREFIXES.some(prefix => key.startsWith(prefix))).sort();
  } catch {
    return [];
  }
}

export function clearLocalAppData(): number {
  if (typeof window === "undefined") return 0;
  clearPrivateLocationHandoff();
  let removed = 0;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[name];
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && APP_PREFIXES.some(prefix => key.startsWith(prefix))) keys.push(key);
      }
      for (const key of keys) {
        try {
          storage.removeItem(key);
          removed += 1;
        } catch {
          // A blocked entry must not prevent deletion of the remaining data.
        }
      }
    } catch {
      // Each storage area can be blocked independently by the browser.
    }
  }
  window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT));
  return removed;
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
