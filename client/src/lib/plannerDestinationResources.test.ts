import { expect, it } from "vitest";
import { ALL_LOCAL_ROUTE_DESTINATIONS, getPlannerStreetReferences, resolveReadyRouteStreetPoint } from "./localRoutePresets";
import { preparePlannerDestinationResources } from "./plannerDestinationResources";
import { isAguasLindasRoutePoint } from "./mapGeometry";
import { isAmbiguousAtlasStreet } from "./cityAtlas";

it("offers sourced, distinct street references without changing the default destination list", () => {
  expect(getPlannerStreetReferences().length).toBeGreaterThanOrEqual(390);
  expect(new Set(getPlannerStreetReferences().map(item => item.destination)).size).toBe(getPlannerStreetReferences().length);
  for (const item of getPlannerStreetReferences()) {
    expect(isAguasLindasRoutePoint(resolveReadyRouteStreetPoint(item.destination))).toBe(true);
    expect(item.sourceLabel).toBeTruthy();
    expect(item.detail).toContain("aproximad");
    expect(isAmbiguousAtlasStreet(item.destination)).toBe(false);
  }
  const prepared = preparePlannerDestinationResources("", "todos");
  expect(prepared.results.all).toEqual(ALL_LOCAL_ROUTE_DESTINATIONS);
  expect(prepared.results.streets).toEqual(getPlannerStreetReferences());
  expect(prepared.counts.streets).toBe(getPlannerStreetReferences().length);
});

it("combines resource modes with text and category with count previews equal to actual lists", () => {
  for (const query of ["", "avenida brasilia", "rua 1", "CRAS", "zzzx-inexistente"]) {
    for (const category of ["todos", "centro", "saude"] as const) {
      const prepared = preparePlannerDestinationResources(query, category);
      for (const mode of ["all", "coordinates", "missing", "streets"] as const) {
        expect(prepared.counts[mode]).toBe(prepared.results[mode].length);
      }
      expect(prepared.results.coordinates.every(item => prepared.results.all.includes(item))).toBe(true);
      expect(prepared.results.missing.every(item => prepared.results.all.includes(item))).toBe(true);
      expect(prepared.counts.coordinates + prepared.counts.missing).toBe(prepared.counts.all);
      expect(prepared.results.coordinates.every(item => !prepared.results.missing.includes(item))).toBe(true);
      if (category === "saude") expect(prepared.results.streets).toEqual([]);
    }
  }
});
