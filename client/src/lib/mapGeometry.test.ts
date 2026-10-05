import { describe, expect, it } from "vitest";
import { decodeMapPolyline, isAguasLindasRoutePoint, isMapPoint } from "./mapGeometry";

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
