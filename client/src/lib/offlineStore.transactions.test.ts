import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOfflineRoutes, getOfflineRoute, listOfflineRoutes, offlineRouteEvent,
  offlineRouteId, removeOfflineRoute, saveOfflineRoute, type OfflineRoute,
} from "./offlineStore";

function route(index: number): OfflineRoute {
  const origin = "Centro";
  const destination = `Hospital ${index}`;
  return {
    id: offlineRouteId(origin, destination, "driving"), origin, destination,
    savedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    payload: { route: { distanceLabel: "1 km", distanceMeters: 1000, durationSeconds: 120, mode: "driving" }, stops: [], anpReferences: [] },
  };
}

beforeEach(() => {
  const indexedDB = new IDBFactory();
  vi.stubGlobal("indexedDB", indexedDB);
  vi.stubGlobal("window", { indexedDB, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

async function seed(routes: OfflineRoute[]) {
  const request = indexedDB.open("trajeto-offline", 2);
  request.onupgradeneeded = () => request.result.createObjectStore("routes", { keyPath: "id" });
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("routes", "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    for (const item of routes) tx.objectStore("routes").put(item);
  });
  db.close();
}

describe("saved route transactions", () => {
  it("keeps exactly the newest 50 routes after concurrent saves", async () => {
    await seed(Array.from({ length: 50 }, (_, i) => route(i)));
    await Promise.all([saveOfflineRoute(route(50)), saveOfflineRoute(route(51))]);
    const saved = await listOfflineRoutes();
    expect(saved).toHaveLength(50);
    expect(saved.map(item => item.id)).toEqual(Array.from({ length: 50 }, (_, i) => route(51 - i).id));
  });

  it("replaces a route without duplicating it, then removes and clears committed records", async () => {
    await saveOfflineRoute(route(1));
    await saveOfflineRoute({ ...route(1), savedAt: route(2).savedAt });
    expect(await listOfflineRoutes()).toHaveLength(1);
    expect((await getOfflineRoute(route(1).id))?.savedAt).toBe(route(2).savedAt);
    await saveOfflineRoute(route(2));
    expect(await removeOfflineRoute(route(1).id)).toBe(true);
    expect(await clearOfflineRoutes()).toBe(1);
    expect(await listOfflineRoutes()).toEqual([]);
  });

  it("migrates private legacy origins and mode ids while preserving the newest duplicate", async () => {
    const privateRoute = { ...route(1), origin: "-15.76123, -48.28123", id: "-15.76123, -48.28123::hospital 1" };
    const safe = { ...route(1), origin: "Minha localização", id: offlineRouteId("Minha localização", "Hospital 1", "driving"), savedAt: route(2).savedAt };
    await seed([privateRoute, safe]);
    const saved = await listOfflineRoutes();
    expect(saved).toEqual([safe]);
    expect(await getOfflineRoute(privateRoute.id)).toEqual(safe);
    expect(await listOfflineRoutes()).toEqual([safe]);
  });

  it("rolls back migration and pruning if a new route cannot be cloned", async () => {
    await seed(Array.from({ length: 50 }, (_, i) => route(i)));
    const invalidClone = { ...route(50), payload: { ...(route(50).payload as object), callback: () => {} } };
    await expect(saveOfflineRoute(invalidClone)).rejects.toThrow();
    expect(await listOfflineRoutes()).toEqual(Array.from({ length: 50 }, (_, i) => route(49 - i)));
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("aborts a stalled transaction, closes the connection and emits no successful save event", async () => {
    vi.useFakeTimers();
    const request: any = { addEventListener: vi.fn() };
    const tx: any = { objectStore: () => ({ getAll: () => request }), abort: vi.fn() };
    const db = { transaction: () => tx, close: vi.fn() };
    vi.stubGlobal("indexedDB", { open: () => {
      const open: any = { result: db };
      queueMicrotask(() => open.onsuccess());
      return open;
    } });
    const result = saveOfflineRoute(route(1));
    const check = expect(result).rejects.toThrow("não respondeu");
    await vi.advanceTimersByTimeAsync(5000);
    await check;
    expect(tx.abort).toHaveBeenCalledOnce();
    expect(db.close).toHaveBeenCalledOnce();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    tx.oncomplete();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("waits for transaction commit even after a successful request", async () => {
    let onSuccess: (() => void) | undefined;
    const request: any = { result: [], addEventListener: (_: string, callback: () => void) => { onSuccess = callback; } };
    const tx: any = { objectStore: () => ({ getAll: () => request, put: vi.fn() }), abort: vi.fn() };
    const db = { transaction: () => tx, close: vi.fn() };
    vi.stubGlobal("indexedDB", { open: () => {
      const open: any = { result: db };
      queueMicrotask(() => open.onsuccess());
      return open;
    } });
    const result = saveOfflineRoute(route(1));
    await vi.waitFor(() => expect(onSuccess).toBeTypeOf("function"));
    onSuccess!();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    tx.oncomplete();
    expect(await result).toBe(true);
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: offlineRouteEvent }));
  });
});
