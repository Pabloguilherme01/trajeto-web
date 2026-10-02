import { PRIVATE_LOCATION_LABEL, isPreciseLocationText, privateOriginForExternalNavigation, privateOriginForHistory, privateOriginForUrl, privateRouteShareOrigin } from "@/lib/locationPrivacy";
const DB_NAME = "trajeto-offline";
const DB_VERSION = 2;
const STORE = "routes";
const OFFLINE_ROUTE_EVENT = "trajeto-offline-route-change";
const MAX_SAVED_ROUTES = 50;
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

function sanitizeOfflineRoute(route: OfflineRoute): OfflineRoute {
  const origin = privateOriginForHistory(route.origin);
  if (origin === route.origin) return route;
  return { ...route, id: offlineRouteId(origin, route.destination, offlineRouteTravelMode(route)), origin };
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
      let result: T;
      // Success of one request does not mean its transaction was committed.
      // Preserve callbacks supplied by a batch operation (such as pruning).
      request.addEventListener("success", () => { result = request.result; });
      tx.oncomplete = () => resolve(result);
      request.onerror = () => reject(request.error ?? new Error("Operação offline falhou."));
      tx.onerror = () => reject(tx.error ?? new Error("Transação offline falhou."));
      tx.onabort = () => reject(tx.error ?? new Error("Transação offline foi interrompida."));
    });
  } finally {
    db.close();
  }
}

export async function saveOfflineRoute(route: OfflineRoute) {
  const safeRoute = sanitizeOfflineRoute(route);
  if (!isValidRoute(safeRoute)) {
    throw new Error("Não foi possível salvar: os dados da rota estão incompletos.");
  }
  if (!hasIndexedDb()) {
    throw new Error("Não foi possível salvar: o armazenamento offline não está disponível neste navegador.");
  }

  await withStore("readwrite", store => store.put(safeRoute));
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
      const validById = new Map<string, OfflineRoute>();

      request.onsuccess = () => {
        for (const candidate of request.result as unknown[]) {
          if (isValidRoute(candidate)) {
            const safeRoute = sanitizeOfflineRoute(candidate);
            const existing = validById.get(safeRoute.id);
            if (!existing || Date.parse(safeRoute.savedAt) > Date.parse(existing.savedAt)) {
              validById.set(safeRoute.id, safeRoute);
            }
            if (safeRoute.id !== candidate.id || safeRoute.origin !== candidate.origin) {
              store.delete(candidate.id);
            }
          } else if (isRecord(candidate) && typeof candidate.id === "string") {
            store.delete(candidate.id);
          }
        }

        for (const safeRoute of validById.values()) store.put(safeRoute);
      };

      tx.oncomplete = () => resolve(
        [...validById.values()].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)),
      );
      request.onerror = () => reject(request.error ?? new Error("Não foi possível ler as rotas salvas."));
      tx.onerror = () => reject(tx.error ?? new Error("Não foi possível validar as rotas salvas."));
      tx.onabort = () => reject(tx.error ?? new Error("Não foi possível validar as rotas salvas."));
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

export async function countOfflineRoutes() {
  if (!hasIndexedDb()) return 0;
  return (await listOfflineRoutes()).length;
}

export async function clearOfflineRoutes() {
  if (!hasIndexedDb()) return 0;

  const keys = await withStore<IDBValidKey[]>("readwrite", store => {
    const request = store.getAllKeys();
    request.addEventListener("success", () => {
      store.clear();
    });
    return request;
  });
  if (keys.length > 0) notifyOfflineRouteChange();
  return keys.length;
}

function migratedOfflineRouteId(id: string) {
  const [origin = "", destination = "", mode] = id.split("::");
  if (origin.trim().length < 2 || destination.trim().length < 2) return id;
  const safeOrigin = privateOriginForHistory(origin);
  if (safeOrigin === origin.trim()) return id;
  const safeMode = mode === "walking" || mode === "cycling" || mode === "transit" || mode === "driving" ? mode : undefined;
  return offlineRouteId(safeOrigin, destination, safeMode);
}

export async function getOfflineRoute(id: string): Promise<OfflineRoute | null> {
  if (!hasIndexedDb()) return null;

  let route = await withStore<unknown>("readonly", store => store.get(id));
  if (!isValidRoute(route)) {
    if (isRecord(route) && typeof route.id === "string") {
      await removeOfflineRoute(route.id);
    }
    const migratedId = migratedOfflineRouteId(id);
    if (migratedId !== id) {
      route = await withStore<unknown>("readonly", store => store.get(migratedId));
    }
    if (!isValidRoute(route)) return null;
  }

  const safeRoute = sanitizeOfflineRoute(route);
  if (safeRoute.id !== route.id || safeRoute.origin !== route.origin) {
    const existing = safeRoute.id !== route.id
      ? await withStore<unknown>("readonly", store => store.get(safeRoute.id))
      : null;
    const routeToKeep = isValidRoute(existing) && Date.parse(existing.savedAt) > Date.parse(safeRoute.savedAt)
      ? existing
      : safeRoute;
    await withStore("readwrite", store => store.put(routeToKeep));
    if (safeRoute.id !== route.id) await withStore("readwrite", store => store.delete(route.id));
    return routeToKeep;
  }
  return safeRoute;
}

export function offlineRouteId(
  origin: string,
  destination: string,
  mode?: "driving" | "walking" | "cycling" | "transit"
) {
  const base = origin.trim().toLocaleLowerCase("pt-BR") + "::" + destination.trim().toLocaleLowerCase("pt-BR");
  return mode ? base + "::" + mode : base;
}


function normalizeOfflineMatchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function findOfflineRouteByDestination(routes: OfflineRoute[], destination: string) {
  const target = normalizeOfflineMatchText(destination);
  if (!target) return null;
  return routes.find(route => normalizeOfflineMatchText(route.destination) === target) ?? null;
}

export function findOfflineRouteByTrip(routes: OfflineRoute[], origin: string, destination: string) {
  const normalizedOrigin = normalizeOfflineMatchText(origin);
  const normalizedDestination = normalizeOfflineMatchText(destination);
  if (!normalizedOrigin || !normalizedDestination) return null;

  return routes.find(route =>
    normalizeOfflineMatchText(route.origin) === normalizedOrigin &&
    normalizeOfflineMatchText(route.destination) === normalizedDestination,
  ) ?? null;
}

export function offlineRouteTravelMode(route: OfflineRoute) {
  if (!isRecord(route.payload) || !isRecord(route.payload.route)) return "driving";
  const mode = route.payload.route.mode;
  return mode === "walking" || mode === "cycling" || mode === "transit"
    ? mode
    : "driving";
}

export function findBestOfflineRouteForTrip(
  routes: OfflineRoute[],
  origin: string,
  destination: string,
  mode: "driving" | "walking" | "cycling" | "transit" = "driving"
) {
  const normalizedOrigin = normalizeOfflineMatchText(origin);
  const normalizedDestination = normalizeOfflineMatchText(destination);
  if (!normalizedOrigin || !normalizedDestination) return null;

  return (
    routes
      .filter(route => !isPreciseLocationText(route.origin))
      .filter(route => offlineRouteTravelMode(route) === mode)
      .filter(route => {
        if (!isRecord(route.payload) || !isRecord(route.payload.route)) return false;
        return route.payload.route.source !== "osrm" || mode === "driving";
      })
      .filter(
        route =>
          normalizeOfflineMatchText(route.origin) === normalizedOrigin &&
          normalizeOfflineMatchText(route.destination) === normalizedDestination
      )
      .sort((a, b) => {
        return Date.parse(b.savedAt) - Date.parse(a.savedAt);
      })[0] ?? null
  );
}

export function isOfflineRouteStale(savedAt: string, now = Date.now(), maxAgeMs = STALE_ROUTE_MAX_AGE_MS) {
  const savedTime = Date.parse(savedAt);
  if (!Number.isFinite(savedTime) || !Number.isFinite(now) || maxAgeMs < 0) return true;
  return now - savedTime > maxAgeMs;
}

export function externalNavigationUrl(route: Pick<OfflineRoute, "origin" | "destination">) {
  const params = new URLSearchParams({
    destination: route.destination.trim(),
    travelmode: "driving",
  });
  const origin = privateOriginForExternalNavigation(route.origin);
  if (origin) params.set("origin", origin);
  return "https://www.google.com/maps/dir/?api=1&" + params.toString();
}

export function offlineRouteShareText(route: Pick<OfflineRoute, "origin" | "destination">) {
  return "Rota salva no Trajeto: " +
    privateRouteShareOrigin(route.origin) +
    " → " +
    route.destination.trim() +
    ".";
}

export function offlineRouteShareUrl(route: Pick<OfflineRoute, "origin" | "destination">) {
  const params = new URLSearchParams({ destino: route.destination.trim() });
  const origin = privateOriginForUrl(route.origin);
  if (origin) params.set("origem", origin);
  return "/planejar?" + params.toString();
}

export function wazeNavigationUrl(route: Pick<OfflineRoute, "destination">) {
  return "https://www.waze.com/ul?q=" + encodeURIComponent(route.destination) + "&navigate=yes";
}

export const offlineRouteEvent = OFFLINE_ROUTE_EVENT;
