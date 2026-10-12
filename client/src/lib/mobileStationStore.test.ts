/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheStations, getCachedStations, listMobileStationFavorites, toggleMobileStationFavorite, type MobileStation } from "./mobileStationStore";
const station: MobileStation = { placeId: "test", name: "Posto", address: "Águas Lindas", lat: -15.7, lng: -48.2, openingHours: [] };
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("armazenamento de postos", () => {
  it("never persists the device search centre, keeping location-scoped results in memory", () => {
    cacheStations("private-nearby", [station], -15.70001, -48.20001);
    expect(localStorage.getItem("trajeto-mobile-station-cache")).toBeNull();
    expect(getCachedStations("private-nearby", -15.7, -48.2)?.stations).toEqual([station]);
    expect(getCachedStations("private-nearby", -15.8, -48.3)).toBeNull();
  });
  it("purges legacy persisted search origins without losing generic offline records", () => {
    const savedAt = new Date().toISOString();
    localStorage.setItem("trajeto-mobile-station-cache", JSON.stringify([
      { query: "legacy-private", lat: -15.7, lng: -48.2, savedAt, stations: [station] },
      { query: "generic-public", savedAt, stations: [station] },
    ]));
    expect(getCachedStations("legacy-private", -15.7, -48.2)).toBeNull();
    expect(getCachedStations("generic-public")?.stations).toEqual([station]);
    const remaining = JSON.parse(localStorage.getItem("trajeto-mobile-station-cache") || "[]");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).not.toHaveProperty("lat");
    expect(remaining[0]).not.toHaveProperty("lng");
  });
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

describe("cache snapshot parsing without stale results", () => {
  const key = "trajeto-mobile-station-cache";

  it("prepares lookup keys and valid station lists once per serialized snapshot", () => {
    const entries = Array.from({ length: 5 }, (_, index) => ({
      query: `Bairro ${index}`, savedAt: new Date().toISOString(),
      stations: Array.from({ length: 30 }, (_, position) => ({
        ...station, placeId: `${index}-${position}`,
      })),
    }));
    localStorage.setItem(key, JSON.stringify(entries));
    const normalize = vi.spyOn(String.prototype, "toLocaleLowerCase");
    const parseDate = vi.spyOn(Date, "parse");
    const first = getCachedStations("bairro 4")!;
    expect(first.stations).toHaveLength(30);
    first.stations.pop();
    const entryNormalizations = () => normalize.mock.contexts.filter(value =>
      String(value).startsWith("Bairro "),
    ).length;
    const initialNormalizations = entryNormalizations();
    const initialDates = parseDate.mock.calls.length;
    for (let read = 0; read < 20; read++) {
      expect(getCachedStations("bairro 4")?.stations).toHaveLength(30);
      expect(getCachedStations("bairro 0")?.stations[0].placeId).toBe("0-0");
    }
    expect(entryNormalizations()).toBe(initialNormalizations);
    expect(parseDate.mock.calls.length).toBe(initialDates);
    localStorage.setItem(key, JSON.stringify([{
      ...entries[4], stations: [{ ...station, placeId: "fresh" }],
    }]));
    expect(getCachedStations("bairro 4")?.stations[0].placeId).toBe("fresh");
    expect(getCachedStations("bairro 0")).toBeNull();
  });

  it("keeps the first duplicate lookup and rounded location scopes independent", () => {
    localStorage.setItem(key, JSON.stringify([
      { query: " Postos ", savedAt: new Date().toISOString(), stations: [station] },
      { query: "POSTOS", savedAt: new Date().toISOString(), stations: [{ ...station, placeId: "duplicate" }] },
    ]));
    expect(getCachedStations("POSTOS")?.stations[0].placeId).toBe("test");
    cacheStations("postos", [{ ...station, placeId: "located" }], -15.70001, -48.20001);
    expect(getCachedStations("postos", -15.7, -48.2)?.stations[0].placeId).toBe("located");
    expect(getCachedStations("postos", -15.8, -48.3)).toBeNull();
  });

  it("parses once per unchanged snapshot and returns independent arrays", () => {
    cacheStations("postos", [station]);
    const raw = localStorage.getItem(key);
    const parse = vi.spyOn(JSON, "parse");
    const first = getCachedStations("postos")!;
    const readsAfterFirst = parse.mock.calls.filter(([text]) => text === raw).length;
    expect(first.stations).toEqual([station]);
    first.stations.pop();
    for (let i = 0; i < 30; i++) {
      expect(getCachedStations("postos")?.stations).toEqual([station]);
    }
    expect(parse.mock.calls.filter(([text]) => text === raw).length).toBe(readsAfterFirst);
  });

  it("sees same-tab writes, other-tab writes and clear immediately", () => {
    cacheStations("postos", [station]);
    expect(getCachedStations("postos")?.stations.map(s => s.placeId)).toEqual(["test"]);
    cacheStations("postos", [{ ...station, placeId: "updated" }]);
    expect(getCachedStations("postos")?.stations.map(s => s.placeId)).toEqual(["updated"]);

    // Another tab can rewrite storage without touching the local module cache.
    localStorage.setItem(key, JSON.stringify([{
      query: "postos", savedAt: new Date().toISOString(),
      stations: [{ ...station, placeId: "cross-tab" }],
    }]));
    expect(getCachedStations("postos")?.stations.map(s => s.placeId)).toEqual(["cross-tab"]);
    localStorage.clear();
    expect(getCachedStations("postos")).toBeNull();
  });

  it("rechecks retention on every read, even when the JSON is unchanged", () => {
    cacheStations("postos", [station]);
    expect(getCachedStations("postos")?.stations).toHaveLength(1);
    const future = Date.now() + 25 * 3_600_000;
    vi.spyOn(Date, "now").mockReturnValue(future);
    expect(getCachedStations("postos")).toBeNull();
  });

  it("discards prior cache after storage errors and malformed replacement", () => {
    cacheStations("postos", [station]);
    expect(getCachedStations("postos")?.stations).toHaveLength(1);
    localStorage.setItem(key, "{not-json");
    const parse = vi.spyOn(JSON, "parse");
    expect(getCachedStations("postos")).toBeNull();
    const invalidReads = parse.mock.calls.filter(([raw]) => raw === "{not-json").length;
    expect(invalidReads).toBe(1);
    expect(getCachedStations("postos")).toBeNull();
    expect(parse.mock.calls.filter(([raw]) => raw === "{not-json").length)
      .toBe(invalidReads);
    localStorage.setItem(key, JSON.stringify([{
      query: "postos", savedAt: new Date().toISOString(), stations: [station],
    }]));
    expect(getCachedStations("postos")?.stations).toHaveLength(1);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    expect(getCachedStations("postos")).toBeNull();
  });
});
