const DB_NAME = "trajeto-offline";
const DB_VERSION = 1;
const STORE = "routes";

type OfflineRoute = {
  id: string;
  origin: string;
  destination: string;
  savedAt: string;
  payload: unknown;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveOfflineRoute(route: OfflineRoute) {
  if (!("indexedDB" in window)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(route);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listOfflineRoutes(): Promise<OfflineRoute[]> {
  if (!("indexedDB" in window)) return [];
  const db = await openDb();
  const routes = await new Promise<OfflineRoute[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as OfflineRoute[]).sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return routes;
}

export async function removeOfflineRoute(id: string) {
  if (!("indexedDB" in window)) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getOfflineRoute(id: string): Promise<OfflineRoute | null> {
  if (!("indexedDB" in window)) return null;
  const db = await openDb();
  const route = await new Promise<OfflineRoute | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve((request.result as OfflineRoute | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return route;
}
