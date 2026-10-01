import { describe, expect, it, beforeEach } from "vitest";
import { normalizeAnpFuelRow } from "@shared/anpRevendedores";

const storage = new Map<string, string>();
const localStorageMock = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
import { cacheOfflineAnpSnapshot, cacheOfflineMapStations, getOfflineMapAgeLabel, getOfflineMapStations, prepareOfflineStationMapFromCatalog } from "./stationMapOffline";

describe("stationMapOffline", () => {
  beforeEach(() => {
    localStorage.clear();
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

  it("can materialize cached ANP coordinates for offline map use", () => {
    const row = normalizeAnpFuelRow({
      cnpj: "13902675000178",
      razaoSocial: "AGUAS LINDAS COMBUSTIVEIS LTDA",
      endereco: "QUADRA 07",
      bairro: "CAMPING CLUBE",
      municipio: "AGUAS LINDAS DE GOIAS",
      uf: "GO",
      latitude: "-15.7646021",
      longitude: "-48.2677716",
    });
    expect(row).toBeTruthy();
    cacheOfflineAnpSnapshot([row!], "2026-10-01T12:00:00.000Z");
    expect(prepareOfflineStationMapFromCatalog()).toBe(true);
    const snapshot = getOfflineMapStations();
    expect(snapshot.stations).toHaveLength(1);
    expect(snapshot.stations[0]?.source).toBe("ANP");
    expect(snapshot.stations.every(station => Number.isFinite(station.lat) && Number.isFinite(station.lng))).toBe(true);
  });

  it("describes cached age without expiring it", () => {
    expect(getOfflineMapAgeLabel("")).toBe("sem cache local");
    expect(getOfflineMapAgeLabel(new Date().toISOString())).toBe("salvo hoje neste aparelho");
  });
});
