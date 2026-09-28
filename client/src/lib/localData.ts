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
