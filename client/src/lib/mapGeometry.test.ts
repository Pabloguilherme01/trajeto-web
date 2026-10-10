import { describe, expect, it } from "vitest";
import { decodeMapPolyline, isAguasLindasRoutePoint, isMapPoint, mapPointBounds } from "./mapGeometry";

describe("map geometry", () => {
  it("decodes the provider polyline with negative coordinates", () => {
    expect(decodeMapPolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });
  it("keeps broad local catalogue bounds separate from global map coordinates", () => {
    expect(isAguasLindasRoutePoint({ lat: -15.7545, lng: -48.2816 })).toBe(true);
    expect(isAguasLindasRoutePoint({ lat: -15.7942, lng: -47.8822 })).toBe(false);
    expect(isMapPoint({ lat: -15.7942, lng: -47.8822 })).toBe(true);
  });

  it("rejects incomplete, invalid and oversized geometry", () => {
    for (const input of ["", "_", "??_", "\n\n", "_".repeat(500001)])
      expect(decodeMapPolyline(input)).toEqual([]);
    expect(isMapPoint({ lat: NaN, lng: 0 })).toBe(false);
    expect(isMapPoint({ lat: 0, lng: 181 })).toBe(false);
  });
});

describe("map framing bounds", () => {
  it("calculates the same extrema as a standard route fit, including GPS", () => {
    expect(mapPointBounds([
      { lat: -15.76, lng: -48.29 },
      { lat: -15.75, lng: -48.28 },
      { lat: -15.77, lng: -48.27 },
    ], { lat: -15.74, lng: -48.30 })).toEqual({
      minLat: -15.77, maxLat: -15.74, minLng: -48.30, maxLng: -48.27,
    });
  });
  it("ignores invalid coordinates and yields null when no location is usable", () => {
    expect(mapPointBounds([{ lat: NaN, lng: -48.28 }])).toBeNull();
    expect(mapPointBounds([{ lat: Infinity, lng: 0 }], { lat: -15.75, lng: -48.28 })).toEqual({
      minLat: -15.75, maxLat: -15.75, minLng: -48.28, maxLng: -48.28,
    });
    expect(mapPointBounds([])).toBeNull();
  });
  it("fits 150,000 geometry points without argument-list overflow", () => {
    const route = Array.from({ length: 150000 }, (_, i) => ({
      lat: -15.8 + (i % 1001) / 10000,
      lng: -48.35 + (i % 1701) / 10000,
    }));
    expect(mapPointBounds(route)).toEqual({
      minLat: -15.8,
      maxLat: -15.8 + 1000 / 10000,
      minLng: -48.35,
      maxLng: -48.35 + 1700 / 10000,
    });
  });
});
