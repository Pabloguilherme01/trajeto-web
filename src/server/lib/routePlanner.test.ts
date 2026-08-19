import { describe, expect, it } from "vitest";
import { normalizeStops, routeSummary } from "./routePlanner";

describe("routePlanner", () => {
  it("deduplicates real-place results by the Google place identifier", () => {
    const stops = normalizeStops([
      { status: "OK", results: [{ place_id: "a", name: "Posto Norte", formatted_address: "Rua 1", geometry: { location: { lat: -15.1, lng: -47.1 } }, types: ["gas_station"] }] },
      { status: "OK", results: [{ place_id: "a", name: "Posto Norte", formatted_address: "Rua 1", geometry: { location: { lat: -15.1, lng: -47.1 } }, types: ["gas_station"] }, { place_id: "b", name: "Posto Sul", formatted_address: "Rua 2", geometry: { location: { lat: -15.2, lng: -47.2 } }, types: ["gas_station"] }] },
    ]);

    expect(stops).toHaveLength(2);
    expect(stops.map(stop => stop.placeId)).toEqual(["a", "b"]);
  });

  it("normalizes a Google route response into application metrics", () => {
    const result = routeSummary({
      status: "OK",
      routes: [{ summary: "BR-040", overview_polyline: { points: "encoded" }, warnings: [], waypoint_order: [], legs: [{ distance: { text: "12 km", value: 12000 }, duration: { text: "18 min", value: 1080 }, start_address: "Origem", end_address: "Destino", start_location: { lat: -15.7, lng: -47.8 }, end_location: { lat: -15.8, lng: -47.9 }, steps: [] }] }],
    });

    expect(result).toMatchObject({ distanceMeters: 12000, durationSeconds: 1080, summary: "BR-040" });
  });
});
