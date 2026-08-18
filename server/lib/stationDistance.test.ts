import { describe, expect, it } from "vitest";
import { distanceMatrixBatches, mergeStationDistances, stationDistances } from "./stationDistance";

describe("stationDistances", () => {
  it("keeps only valid driving distances in the same order as public station results", () => {
    const distances = stationDistances({ origin_addresses: ["Origem"], destination_addresses: ["A", "B"], status: "OK", rows: [{ elements: [{ status: "OK", distance: { text: "4,2 km", value: 4200 }, duration: { text: "9 min", value: 540 } }, { status: "ZERO_RESULTS", distance: { text: "", value: 0 }, duration: { text: "", value: 0 } }] }] }, 2);
    expect(distances).toEqual([{ distanceMeters: 4200, distanceLabel: "4,2 km" }, { distanceMeters: null, distanceLabel: null }]);
  });

  it("splits more than 12 destinations and preserves their ordered distances after merge", () => {
    expect(distanceMatrixBatches(Array.from({ length: 20 }, (_, index) => index))).toEqual([Array.from({ length: 12 }, (_, index) => index), Array.from({ length: 8 }, (_, index) => index + 12)]);
    const matrix = (start: number, count: number) => ({ origin_addresses: ["Origem"], destination_addresses: [], status: "OK", rows: [{ elements: Array.from({ length: count }, (_, index) => ({ status: "OK" as const, distance: { text: `${start + index} m`, value: start + index }, duration: { text: "1 min", value: 60 } })) }] });
    expect(mergeStationDistances([matrix(1, 12), matrix(13, 8)], 20).map(item => item.distanceMeters)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  });
});
