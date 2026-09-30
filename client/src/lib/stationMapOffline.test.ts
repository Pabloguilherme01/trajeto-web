// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { cacheOfflineMapStations, getOfflineMapAgeLabel, getOfflineMapStations } from "./stationMapOffline";

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
    expect(snapshot.stations).toHaveLength(2);
    expect(snapshot.stations[0]?.source).toBe("ANP");
    expect(snapshot.savedAt).toBeTruthy();
  });

  it("describes cached age without expiring it", () => {
    expect(getOfflineMapAgeLabel("")).toBe("sem cache local");
    expect(getOfflineMapAgeLabel(new Date().toISOString())).toBe("salvo hoje neste aparelho");
  });
});
