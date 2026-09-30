import { describe, expect, it } from "vitest";
import { compareBestValue, filterAndSortStations, inferredBrand } from "./stationListControls";

describe("station list controls", () => {
  const stations = [
    { name: "Posto Shell", isOpen: true, distanceMeters: 2200 },
    { name: "Posto Ipiranga", isOpen: false, distanceMeters: 900 },
    { name: "Posto Local", isOpen: null, distanceMeters: null },
  ];

  it("derives only brands explicitly present in the mapped place name", () => {
    expect(inferredBrand("Posto Shell")).toBe("Shell");
    expect(inferredBrand("Posto Vale")).toBe("Outras / não declarada");
  });

  it("filters status and orders mapped stations without inventing unavailable distances", () => {
    expect(filterAndSortStations(stations, "all", "open", "distance").map(station => station.name)).toEqual(["Posto Shell"]);
    expect(filterAndSortStations(stations, "all", "all", "distance").map(station => station.name)).toEqual(["Posto Ipiranga", "Posto Shell", "Posto Local"]);
    expect(filterAndSortStations(stations, "all", "all", "relevance").map(station => station.name)).toEqual(["Posto Shell", "Posto Ipiranga", "Posto Local"]);
  });
});

it("prioritizes a balanced option using price, proximity, opening status and data confirmation", () => {
  const nearExpensive = { distanceKm: 1, price: 6.2, isOpen: true, hasAnp: true };
  const farCheap = { distanceKm: 8, price: 5.4, isOpen: true, hasAnp: true };
  const balanced = { distanceKm: 2, price: 5.7, isOpen: true, hasAnp: true };
  expect(compareBestValue(balanced, nearExpensive)).toBeLessThan(0);
  expect(compareBestValue(balanced, farCheap)).toBeLessThan(0);
});
