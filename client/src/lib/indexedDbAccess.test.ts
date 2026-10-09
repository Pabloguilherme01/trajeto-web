import { afterEach, expect, it, vi } from "vitest";
import { openIndexedDatabase } from "./indexedDbAccess";
import { idbGet, idbPut } from "./offlineDb";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("rejects blocked upgrades and closes a connection that arrives after rejection", async () => {
  const request: any = {};
  const db = { close: vi.fn() };
  vi.stubGlobal("indexedDB", { open: () => request });
  const result = openIndexedDatabase("routes", 2, vi.fn());
  const check = expect(result).rejects.toThrow("Outra aba");
  request.onblocked();
  await check;
  request.result = db;
  request.onsuccess();
  expect(db.close).toHaveBeenCalledOnce();
});

it("does not wait forever for an unresponsive IndexedDB open", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("indexedDB", { open: () => ({}) });
  const result = openIndexedDatabase("routes", 2, vi.fn());
  const check = expect(result).rejects.toThrow("não respondeu");
  await vi.advanceTimersByTimeAsync(5000);
  await check;
});

it("closes live connections when another tab needs a schema upgrade", async () => {
  const request: any = {};
  const db = { close: vi.fn(), onversionchange: null as any };
  vi.stubGlobal("indexedDB", { open: () => request });
  const result = openIndexedDatabase("routes", 2, vi.fn());
  request.result = db;
  request.onsuccess();
  expect(await result).toBe(db);
  db.onversionchange();
  expect(db.close).toHaveBeenCalledOnce();
});

it("returns an optional-cache fallback when storage is blocked or cloning fails", async () => {
  vi.stubGlobal("indexedDB", { open: () => { throw new Error("blocked"); } });
  expect(await idbGet("data", "prices")).toBeNull();
  expect(await idbPut("data", "prices", {})).toBe(false);
  const transaction = { objectStore: () => ({ put: () => { throw new Error("DataCloneError"); } }), abort: vi.fn() };
  const db = { close: vi.fn(), transaction: () => transaction };
  vi.stubGlobal("indexedDB", { open: () => {
    const request: any = { result: db };
    queueMicrotask(() => request.onsuccess());
    return request;
  } });
  expect(await idbPut("data", "prices", {})).toBe(false);
  expect(transaction.abort).toHaveBeenCalledOnce();
  expect(db.close).toHaveBeenCalledOnce();
});

it("does not report a successful write before its transaction commits", async () => {
  const request: any = {};
  const transaction: any = { objectStore: () => ({ put: () => request }) };
  const db = { close: vi.fn(), transaction: () => transaction };
  vi.stubGlobal("indexedDB", { open: () => {
    const open: any = { result: db };
    queueMicrotask(() => open.onsuccess());
    return open;
  } });
  const result = idbPut("map", "stations", {});
  await vi.waitFor(() => expect(transaction.onabort).toBeTypeOf("function"));
  request.onsuccess();
  transaction.onabort();
  expect(await result).toBe(false);
});

it("aborts stalled cache transactions and returns a fallback", async () => {
  vi.useFakeTimers();
  const transaction: any = { objectStore: () => ({ get: () => ({}) }), abort: vi.fn() };
  const db = { close: vi.fn(), transaction: () => transaction };
  vi.stubGlobal("indexedDB", { open: () => {
    const open: any = { result: db };
    queueMicrotask(() => open.onsuccess());
    return open;
  } });
  const result = idbGet("data", "prices");
  await vi.advanceTimersByTimeAsync(5000);
  expect(await result).toBeNull();
  expect(transaction.abort).toHaveBeenCalledOnce();
  expect(db.close).toHaveBeenCalledOnce();
});
