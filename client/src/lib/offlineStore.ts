const DB_NAME = "trajeto-offline";
const DB_VERSION = 1;
const STORE = "routes";
const OFFLINE_ROUTE_EVENT = "trajeto-offline-route-change";

export type OfflineRoute = {
  id: string;
  origin: string;
  destination: string;
  savedAt: string;
  payload: unknown;
};

function notifyOfflineRouteChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OFFLINE_ROUTE_EVENT));
}

function hasValidText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOfflineRoute(value: unknown): value is OfflineRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<OfflineRoute>;
  return hasValidText(route.id)
    && hasValidText(route.origin)
    && hasValidText(route.destination)
    && hasValidText(route.savedAt)
    && Number.isFinite(Date.parse(route.savedAt))
    && Boolean(route.payload && typeof route.payload === "object");
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir as rotas salvas."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withDb<T>(operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(db.transaction(STORE, "readonly").objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Não foi possível ler as rotas salvas."));
    });
  } finally {
    db.close();
  }
}

export async function saveOfflineRoute(route: OfflineRoute) {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  if (!isOfflineRoute(route)) throw new Error("A rota não tem dados suficientes para ser salva.");
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(route);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Não foi possível salvar a rota."));
    });
  } finally {
    db.close();
  }
  notifyOfflineRouteChange();
}

export async function listOfflineRoutes(): Promise<OfflineRoute[]> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return [];
  const rawRoutes = await withDb<unknown[]>(store => store.getAll());
  const validRoutes = rawRoutes.filter(isOfflineRoute);
  const corruptIds = rawRoutes
    .filter(route => !isOfflineRoute(route))
    .map(route => route && typeof route === "object" && "id" in route && typeof route.id === "string" ? route.id : null)
    .filter((id): id is string => Boolean(id));

  if (corruptIds.length) {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        corruptIds.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
    notifyOfflineRouteChange();
  }

  return validRoutes.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function removeOfflineRoute(id: string) {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Não foi possível excluir a rota."));
    });
  } finally {
    db.close();
  }
  notifyOfflineRouteChange();
}

export async function getOfflineRoute(id: string): Promise<OfflineRoute | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  const route = await withDb<unknown>(store => store.get(id));
  if (!route) return null;
  if (isOfflineRoute(route)) return route;
  const corruptId = route && typeof route === "object" && "id" in route && typeof route.id === "string" ? route.id : id;
  await removeOfflineRoute(corruptId);
  return null;
}

export const offlineRouteEvent = OFFLINE_ROUTE_EVENT;
