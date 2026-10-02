import { describe, expect, it, beforeEach, vi } from "vitest";
import { idbGet } from "./offlineDb";
vi.mock("./offlineDb", () => ({ idbGet: vi.fn(), idbPut: vi.fn().mockResolvedValue(true) }));

const storage = new Map<string, string>();
const localStorageMock = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
import { cacheOfflineMapStations, getOfflineMapAgeLabel, getOfflineMapStations, hydrateOfflineMapStations, hydrateOfflineAnpSnapshot } from "./stationMapOffline";

describe("stationMapOffline", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(idbGet).mockReset();
  });

  it("persists and deduplicates map references for offline use", () => {
    const official = {
      id: "anp-123",
      cnpj: "123",
      name: "Posto oficial",
      address: "Rua A",
      lat: -15.75,
      lng: -48.28,
      source: "ANP" as const,
    };
    const secondary = {
      id: "google-1",
      placeId: "google-1",
      name: "Posto mapa",
      address: "Rua B",
      lat: -15.76,
      lng: -48.29,
      source: "Google" as const,
    };

    expect(cacheOfflineMapStations([official, secondary])).toBe(true);
    expect(cacheOfflineMapStations([official])).toBe(true);

    const snapshot = getOfflineMapStations();
    // Google Places content is intentionally excluded from persistent offline storage.
    expect(snapshot.stations).toHaveLength(1);
    expect(snapshot.stations[0]?.source).toBe("ANP");
    expect(snapshot.savedAt).toBeTruthy();
  });

  it("describes cached age without expiring it", () => {
    expect(getOfflineMapAgeLabel("")).toBe("sem cache local");
    expect(getOfflineMapAgeLabel(new Date().toISOString())).toBe("salvo hoje neste aparelho");
  });

  it("filters legacy IndexedDB stations before restoring the map", async () => {
    const station = { id: "local-1", name: "Posto", address: "Rua A", lat: -15.75, lng: -48.28, source: "local" };
    vi.mocked(idbGet).mockResolvedValue({ savedAt: "today", stations: [station, { ...station, id: "google", source: "Google" }, null, { ...station, lat: 100 }] });
    const snapshot = await hydrateOfflineMapStations();
    expect(snapshot.stations).toEqual([station]);
    expect(getOfflineMapStations()).toEqual(snapshot);
  });

  it("falls back to local data when IndexedDB content is malformed", async () => {
    cacheOfflineMapStations([{ id: "local", name: "Posto", address: "Rua", lat: -15, lng: -48 }]);
    vi.mocked(idbGet).mockResolvedValue({ stations: "corrupted", rows: "corrupted" });
    expect((await hydrateOfflineMapStations()).stations).toHaveLength(1);
    expect((await hydrateOfflineAnpSnapshot()).rows).toEqual([]);
  });
});
