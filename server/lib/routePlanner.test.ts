import { describe, expect, it } from "vitest";
import { normalizeStops, routeCorridorPoints, routeSummary } from "./routePlanner";

describe("routePlanner", () => {
  it("deduplicates real-place results by the Google place identifier", () => {
    const stops = normalizeStops([
      { status: "OK", results: [{ place_id: "a", name: "Posto Norte", formatted_address: "Rua 1", geometry: { location: { lat: -15.1, lng: -47.1 } }, types: ["gas_station"] }] },
      { status: "OK", results: [{ place_id: "a", name: "Posto Norte", formatted_address: "Rua 1", geometry: { location: { lat: -15.1, lng: -47.1 } }, types: ["gas_station"] }, { place_id: "b", name: "Posto Sul", formatted_address: "Rua 2", geometry: { location: { lat: -15.2, lng: -47.2 } }, types: ["gas_station"] }] },
    ]);

    expect(stops).toHaveLength(2);
    expect(stops.map(stop => stop.placeId)).toEqual(["a", "b"]);
  });


  it("extracts intermediate points for corridor searches", () => {
    const result = {
      status: "OK",
      routes: [{
        summary: "BR-070",
        overview_polyline: { points: "encoded" },
        warnings: [],
        waypoint_order: [],
        legs: [{
          distance: { text: "50 km", value: 50000 },
          duration: { text: "45 min", value: 2700 },
          start_address: "Origem",
          end_address: "Destino",
          start_location: { lat: -15.7, lng: -47.8 },
          end_location: { lat: -15.8, lng: -47.9 },
          steps: [
            { start_location: { lat: -15.70, lng: -47.80 } },
            { start_location: { lat: -15.71, lng: -47.81 } },
            { start_location: { lat: -15.72, lng: -47.82 } },
            { start_location: { lat: -15.73, lng: -47.83 } },
            { start_location: { lat: -15.74, lng: -47.84 } },
            { start_location: { lat: -15.75, lng: -47.85 } },
          ],
        }],
      }],
    };

    expect(routeCorridorPoints(result as never, 4)).toHaveLength(4);
  });

  it("normalizes a Google route response into application metrics", () => {
    const result = routeSummary({
      status: "OK",
      routes: [{ summary: "BR-040", overview_polyline: { points: "encoded" }, warnings: [], waypoint_order: [], legs: [{ distance: { text: "12 km", value: 12000 }, duration: { text: "18 min", value: 1080 }, start_address: "Origem", end_address: "Destino", start_location: { lat: -15.7, lng: -47.8 }, end_location: { lat: -15.8, lng: -47.9 }, steps: [] }] }],
    });

    expect(result).toMatchObject({ distanceMeters: 12000, durationSeconds: 1080, summary: "BR-040" });
  });
});
