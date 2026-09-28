const DB_NAME = "trajeto-offline";
const DB_VERSION = 2;
const STORE = "routes";
const OFFLINE_ROUTE_EVENT = "trajeto-offline-route-change";
const MAX_SAVED_ROUTES = 30;
const MAX_TEXT_LENGTH = 500;
const MAX_PAYLOAD_BYTES = 900_000;
const STALE_ROUTE_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export type OfflineRoute = {
  id: string;
  origin: string;
  destination: string;
  savedAt: string;
  payload: unknown;
};

function notifyOfflineRouteChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_ROUTE_EVENT));
  }
}

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidPayload(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.route)) return false;
  try {
    if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) return false;
  } catch {
    return false;
  }
  const route = payload.route;
  if (
    typeof route.distanceLabel !== "string" ||
    typeof route.distanceMeters !== "number" ||
    !Number.isFinite(route.distanceMeters) ||
    typeof route.durationSeconds !== "number" ||
    !Number.isFinite(route.durationSeconds) ||
    route.distanceMeters < 0 ||
    route.durationSeconds < 0 ||
    !Array.isArray(payload.stops) ||
    !Array.isArray(payload.anpReferences)
  ) {
    return false;
  }

  return payload.stops.every(stop =>
    isRecord(stop) &&
    typeof stop.placeId === "string" &&
    stop.placeId.length > 0 &&
    typeof stop.name === "string" &&
    stop.name.length > 0 &&
    typeof stop.address === "string" &&
    stop.address.length > 0,
  );
}

function isValidRoute(value: unknown): value is OfflineRoute {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.origin === "string" &&
    value.origin.trim().length >= 2 &&
    value.origin.length <= MAX_TEXT_LENGTH &&
    typeof value.destination === "string" &&
    value.destination.trim().length >= 2 &&
    value.destination.length <= MAX_TEXT_LENGTH &&
    typeof value.savedAt === "string" &&
    Number.isFinite(Date.parse(value.savedAt)) &&
    isValidPayload(value.payload)
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB indisponível neste navegador."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o armazenamento offline."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Operação offline falhou."));
      tx.onerror = () => reject(tx.error ?? new Error("Transação offline falhou."));
    });
  } finally {
    db.close();
  }
}

export async function saveOfflineRoute(route: OfflineRoute) {
  if (!isValidRoute(route)) {
    throw new Error("Não foi possível salvar: os dados da rota estão incompletos.");
  }
  if (!hasIndexedDb()) return false;

  await withStore("readwrite", store => store.put(route));
  const routes = await listOfflineRoutes();
  if (routes.length > MAX_SAVED_ROUTES) {
    const excessIds = routes.slice(MAX_SAVED_ROUTES).map(item => item.id);
    await withStore("readwrite", store => {
      const request = store.getAllKeys();
      request.onsuccess = () => {
        for (const key of request.result) {
          if (excessIds.includes(String(key))) store.delete(key);
        }
      };
      return request;
    });
  }
  notifyOfflineRouteChange();
  return true;
}

export async function listOfflineRoutes(): Promise<OfflineRoute[]> {
  if (!hasIndexedDb()) return [];

  const db = await openDb();
  try {
    return await new Promise<OfflineRoute[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const valid: OfflineRoute[] = [];
        for (const candidate of request.result as unknown[]) {
          if (isValidRoute(candidate)) {
            valid.push(candidate);
          } else if (isRecord(candidate) && typeof candidate.id === "string") {
            store.delete(candidate.id);
          }
        }

        valid.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
        resolve(valid);
      };

      request.onerror = () => reject(request.error ?? new Error("Não foi possível ler as rotas salvas."));
      tx.onerror = () => reject(tx.error ?? new Error("Não foi possível validar as rotas salvas."));
    });
  } finally {
    db.close();
  }
}

export async function removeOfflineRoute(id: string) {
  if (!hasIndexedDb()) return false;

  await withStore("readwrite", store => store.delete(id));
  notifyOfflineRouteChange();
  return true;
}

export async function getOfflineRoute(id: string): Promise<OfflineRoute | null> {
  if (!hasIndexedDb()) return null;

  const route = await withStore<unknown>("readonly", store => store.get(id));
  if (!isValidRoute(route)) {
    if (isRecord(route) && typeof route.id === "string") {
      await removeOfflineRoute(route.id);
    }
    return null;
  }

  return route;
}

export function offlineRouteId(origin: string, destination: string) {
  return origin.trim().toLocaleLowerCase("pt-BR") + "::" + destination.trim().toLocaleLowerCase("pt-BR");
}


export function findOfflineRouteByDestination(routes: OfflineRoute[], destination: string) {
  const target = destination.trim().toLocaleLowerCase("pt-BR");
  if (!target) return null;
  return routes.find(route => route.destination.trim().toLocaleLowerCase("pt-BR") === target) ?? null;
}

export function findOfflineRouteByTrip(routes: OfflineRoute[], origin: string, destination: string) {
  const normalizedOrigin = origin.trim().toLocaleLowerCase("pt-BR");
  const normalizedDestination = destination.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedOrigin || !normalizedDestination) return null;

  return routes.find(route =>
    route.origin.trim().toLocaleLowerCase("pt-BR") === normalizedOrigin &&
    route.destination.trim().toLocaleLowerCase("pt-BR") === normalizedDestination,
  ) ?? null;
}

export function isOfflineRouteStale(savedAt: string, now = Date.now(), maxAgeMs = STALE_ROUTE_MAX_AGE_MS) {
  const savedTime = Date.parse(savedAt);
  if (!Number.isFinite(savedTime) || !Number.isFinite(now) || maxAgeMs < 0) return true;
  return now - savedTime > maxAgeMs;
}

export function externalNavigationUrl(route: Pick<OfflineRoute, "origin" | "destination">) {
  return "https://www.google.com/maps/dir/?api=1&origin=" +
    encodeURIComponent(route.origin) +
    "&destination=" +
    encodeURIComponent(route.destination) +
    "&travelmode=driving";
}

export function wazeNavigationUrl(route: Pick<OfflineRoute, "destination">) {
  return "https://www.waze.com/ul?q=" + encodeURIComponent(route.destination) + "&navigate=yes";
}

export const offlineRouteEvent = OFFLINE_ROUTE_EVENT;
