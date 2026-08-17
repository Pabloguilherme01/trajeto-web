import { describe, expect, it } from "vitest";
import { stationDistances } from "./stationDistance";

describe("stationDistances", () => {
  it("keeps only valid driving distances in the same order as public station results", () => {
    const distances = stationDistances({ origin_addresses: ["Origem"], destination_addresses: ["A", "B"], status: "OK", rows: [{ elements: [{ status: "OK", distance: { text: "4,2 km", value: 4200 }, duration: { text: "9 min", value: 540 } }, { status: "ZERO_RESULTS", distance: { text: "", value: 0 }, duration: { text: "", value: 0 } }] }] }, 2);
    expect(distances).toEqual([{ distanceMeters: 4200, distanceLabel: "4,2 km" }, { distanceMeters: null, distanceLabel: null }]);
  });
});
