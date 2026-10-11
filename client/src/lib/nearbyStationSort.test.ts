import { describe, expect, it } from "vitest";
import { distanceKm, type OfflinePoint } from "./offlineRouteMath";
import { sortStationsByDistance } from "./nearbyStationSort";

type Station = OfflinePoint & { id: string };
const origin = { lat: -15.74, lng: -48.28 };

function previousSort(stations: readonly Station[]): Station[] {
  return [...stations].sort((a, b) =>
    distanceKm(origin, a) - distanceKm(origin, b)
  );
}

describe("nearby-station distance sort", () => {
  it("keeps precisely the same order as the old comparator for many catalogues", () => {
    for (const size of [0, 1, 2, 10, 30, 250, 600]) {
      const stations = Array.from({ length: size }, (_, i) => ({
        id: "station-" + i,
        lat: -15.74 + (((i * 31) % 47) - 23) / 10_000,
        lng: -48.28 + (((i * 17) % 37) - 18) / 10_000,
      }));
      expect(sortStationsByDistance(stations, origin).map(s => s.id))
        .toEqual(previousSort(stations).map(s => s.id));
    }
  });

  it("retains stable ties, does not alter caller order or station identity", () => {
    const a = { id: "alpha", lat: origin.lat, lng: origin.lng };
    const b = { id: "bravo", lat: origin.lat, lng: origin.lng };
    const c = { id: "charlie", lat: origin.lat + 0.05, lng: origin.lng };
    const stations = [c, a, b] as const;
    const result = sortStationsByDistance(stations, origin);
    expect(result).toEqual([a, b, c]);
    expect(result[0]).toBe(a);
    expect(result[1]).toBe(b);
    expect(stations).toEqual([c, a, b]);
    expect(result).not.toBe(stations);
  });

  it("keeps the component's no-origin and disabled-nearby bypass", () => {
    const stations: Station[] = [
      { id: "far", lat: -15.8, lng: -48.3 },
      { id: "close", lat: origin.lat, lng: origin.lng },
    ];
    const active = (nearby: boolean, coords: OfflinePoint | null) =>
      nearby && coords ? sortStationsByDistance(stations, coords) : stations;
    expect(active(false, origin)).toBe(stations);
    expect(active(true, null)).toBe(stations);
    expect(active(true, origin).map(s => s.id)).toEqual(["close", "far"]);
  });
});
