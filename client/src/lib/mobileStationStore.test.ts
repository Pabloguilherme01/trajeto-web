/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheStations, getCachedStations, listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "./mobileStationStore";
const station: MobileStation = { placeId: "test", name: "Posto", address: "Águas Lindas", lat: -15.7, lng: -48.2, openingHours: [] };
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("armazenamento de postos", () => {
  it("keeps valid cache usable alongside malformed records", () => {
    localStorage.setItem("trajeto-mobile-station-cache", JSON.stringify([{ query: 10 }, { query: "postos", lat: "bad", lng: 2, savedAt: new Date().toISOString(), stations: [] }]));
    expect(getCachedStations("postos", -15.7, -48.2)).toBeNull();
    cacheStations("postos", [station], -15.7, -48.2);
    expect(getCachedStations("postos", -15.7, -48.2)?.stations).toEqual([station]);
  });
  it("does not report success or remove existing favorites when a write fails", () => {
    toggleMobileStationFavorite(station);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(toggleMobileStationFavorite(station)).toMatchObject({ error: true, saved: true, stations: [station] });
    expect(toggleMobileStationFavorite({ ...station, placeId: "another" })).toMatchObject({ error: true, saved: false, stations: [station] });
    expect(listMobileStationFavorites()).toEqual([station]);
  });
  it("rejects invalid coordinates and cached station payloads", () => {
    expect(toggleMobileStationFavorite({ ...station, lat: 200 }).error).toBe(true);
    cacheStations("postos", [{ ...station, lat: Number.NaN }]);
    expect(getCachedStations("postos")).toBeNull();
    localStorage.setItem("trajeto-mobile-station-cache", JSON.stringify([{ query: "postos", savedAt: new Date().toISOString(), stations: [station, { ...station, lat: 200 }] }]));
    expect(getCachedStations("postos")?.stations).toEqual([station]);
  });
  it("ignores expired and implausibly future snapshots", () => {
    for (const offset of [-25 * 3600000, 3600000]) {
      localStorage.setItem("trajeto-mobile-station-cache", JSON.stringify([{ query: "postos", savedAt: new Date(Date.now() + offset).toISOString(), stations: [station] }]));
      expect(getCachedStations("postos")).toBeNull();
    }
  });
});
