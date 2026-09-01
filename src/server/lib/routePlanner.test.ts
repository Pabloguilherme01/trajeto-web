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

  it("sums distance and duration for route with multiple legs (2 legs)", () => {
    const result = routeSummary({
      status: "OK",
      routes: [{
        summary: "Via Waypoint",
        overview_polyline: { points: "encoded_multi" },
        warnings: [],
        waypoint_order: [],
        legs: [
          { distance: { text: "10 km", value: 10000 }, duration: { text: "10 min", value: 600 }, start_address: "Origem", end_address: "Waypoint", start_location: { lat: -15.7, lng: -47.8 }, end_location: { lat: -15.75, lng: -47.85 }, steps: [] },
          { distance: { text: "22 km", value: 22000 }, duration: { text: "20 min", value: 1200 }, start_address: "Waypoint", end_address: "Destino", start_location: { lat: -15.75, lng: -47.85 }, end_location: { lat: -15.8, lng: -47.9 }, steps: [] },
        ],
      }],
    });

    expect(result.distanceMeters).toBe(32000);
    expect(result.durationSeconds).toBe(1800);
    expect(result.origin).toEqual({ lat: -15.7, lng: -47.8 });
    expect(result.destination).toEqual({ lat: -15.8, lng: -47.9 });
  });

  it("sums distance and duration for route with three legs", () => {
    const result = routeSummary({
      status: "OK",
      routes: [{
        summary: "Via Multiple Stops",
        overview_polyline: { points: "encoded_three" },
        warnings: [],
        waypoint_order: [],
        legs: [
          { distance: { text: "5 km", value: 5000 }, duration: { text: "5 min", value: 300 }, start_address: "A", end_address: "B", start_location: { lat: -15.0, lng: -47.0 }, end_location: { lat: -15.1, lng: -47.1 }, steps: [] },
          { distance: { text: "15 km", value: 15000 }, duration: { text: "15 min", value: 900 }, start_address: "B", end_address: "C", start_location: { lat: -15.1, lng: -47.1 }, end_location: { lat: -15.2, lng: -47.2 }, steps: [] },
          { distance: { text: "25 km", value: 25000 }, duration: { text: "25 min", value: 1500 }, start_address: "C", end_address: "D", start_location: { lat: -15.2, lng: -47.2 }, end_location: { lat: -15.3, lng: -47.3 }, steps: [] },
        ],
      }],
    });

    expect(result.distanceMeters).toBe(45000);
    expect(result.durationSeconds).toBe(2700);
    expect(result.origin).toEqual({ lat: -15.0, lng: -47.0 });
    expect(result.destination).toEqual({ lat: -15.3, lng: -47.3 });
  });

  it("throws error when routes array is empty", () => {
    expect(() => routeSummary({ status: "OK", routes: [] })).toThrow("Não foi possível calcular uma rota");
  });

  it("throws error when legs array is missing", () => {
    expect(() => routeSummary({ status: "OK", routes: [{ summary: "test", overview_polyline: { points: "x" }, warnings: [], waypoint_order: [], legs: [] as any[] }] })).toThrow("Não foi possível calcular uma rota");
  });

  it("uses first leg start_location as origin", () => {
    const result = routeSummary({
      status: "OK",
      routes: [{
        summary: "Test",
        overview_polyline: { points: "x" },
        warnings: [],
        waypoint_order: [],
        legs: [
          { distance: { text: "1 km", value: 1000 }, duration: { text: "1 min", value: 60 }, start_address: "Start", end_address: "End", start_location: { lat: -10.0, lng: -20.0 }, end_location: { lat: -11.0, lng: -21.0 }, steps: [] },
        ],
      }],
    });
    expect(result.origin).toEqual({ lat: -10.0, lng: -20.0 });
  });

  it("uses last leg end_location as destination", () => {
    const result = routeSummary({
      status: "OK",
      routes: [{
        summary: "Test",
        overview_polyline: { points: "x" },
        warnings: [],
        waypoint_order: [],
        legs: [
          { distance: { text: "1 km", value: 1000 }, duration: { text: "1 min", value: 60 }, start_address: "A", end_address: "B", start_location: { lat: -10.0, lng: -20.0 }, end_location: { lat: -11.0, lng: -21.0 }, steps: [] },
          { distance: { text: "2 km", value: 2000 }, duration: { text: "2 min", value: 120 }, start_address: "B", end_address: "C", start_location: { lat: -11.0, lng: -21.0 }, end_location: { lat: -12.0, lng: -22.0 }, steps: [] },
        ],
      }],
    });
    expect(result.destination).toEqual({ lat: -12.0, lng: -22.0 });
  });
});
