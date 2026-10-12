import { expect, it } from "vitest";
import { ALL_LOCAL_ROUTE_DESTINATIONS, getPlannerStreetReferences, getPlannerAreaReferences, resolveReadyRouteStreetPoint } from "./localRoutePresets";
import { preparePlannerDestinationResources } from "./plannerDestinationResources";
import { isAguasLindasRoutePoint } from "./mapGeometry";
import { isAmbiguousAtlasStreet } from "./cityAtlas";

it("reuses catalog lists when only origin, travel mode or saved routes change", () => {
  const first = preparePlannerDestinationResources("avenida", "todos", { origin: "UPA", mode: "driving" });
  const second = preparePlannerDestinationResources("avenida", "todos", { origin: "Prefeitura", mode: "walking", savedRoutes: [] });
  for (const key of ["all", "coordinates", "missing", "streets", "areas"] as const) {
    expect(second.results[key]).toBe(first.results[key]);
    expect(second.counts[key]).toBe(first.counts[key]);
  }
  const changed = preparePlannerDestinationResources("CRAS", "todos");
  expect(changed.results.all).not.toEqual(first.results.all);
});

it("updates prepared availability for saved geometry and mode without reusing stale trip results", () => {
  const destination = ALL_LOCAL_ROUTE_DESTINATIONS.find(item => item.label === "UPA")!.destination;
  const first = preparePlannerDestinationResources("UPA", "saude", { origin: "Prefeitura", savedRoutes: [] });
  const savedRoutes = [{ id: "prepared-upa", origin: "Prefeitura", destination, savedAt: "2026-10-12T10:00:00Z",
    payload: { route: { mode: "driving", source: "offline-road", polyline: "encoded", distanceMeters: 5000, durationSeconds: 500 }, stops: [], anpReferences: [] } }];
  const prepared = preparePlannerDestinationResources("UPA", "saude", { origin: "Prefeitura", savedRoutes, mode: "driving" });
  expect(prepared.results.all).toBe(first.results.all);
  expect(first.counts.prepared).toBe(0);
  expect(prepared.results.prepared.map(item => item.destination)).toEqual([destination]);
  expect(preparePlannerDestinationResources("UPA", "saude", { origin: "Prefeitura", savedRoutes, mode: "walking" }).counts.prepared).toBe(0);
});

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
      for (const mode of ["all", "coordinates", "missing", "streets", "areas", "prepared"] as const) {
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


it("combines municipality-sourced bairro names with category and resource modes without inventing coordinates", () => {
  const selected = preparePlannerDestinationResources("", "todos", { area: "bairro-jardim-brasilia" });
  expect(selected.results.all.length).toBeGreaterThan(0);
  expect(selected.results.all.every(item => /jardim brasília/i.test(item.label + " " + item.detail + " " + item.destination))).toBe(true);
  expect(selected.counts.coordinates + selected.counts.missing).toBe(selected.counts.all);
  const nonexistent = preparePlannerDestinationResources("nome inexistente", "saude", { area: "bairro-jardim-brasilia" });
  expect(nonexistent.counts.all).toBe(0);
  expect(nonexistent.counts.prepared).toBe(0);
});

it("offers sourced municipal bairros as textual references without converting them into map points", () => {
  const references = getPlannerAreaReferences();
  expect(references.length).toBe(68);
  expect(new Set(references.map(item => item.id)).size).toBe(references.length);
  expect(references.every(item => item.sourceUrl?.startsWith("https://") &&
    item.sourceLabel?.includes("Prefeitura") && item.detail.includes("sem ponto"))).toBe(true);
  const listed = preparePlannerDestinationResources("", "centro");
  expect(listed.results.areas).toHaveLength(68);
  expect(listed.counts.areas).toBe(68);
  expect(listed.results.areas.find(item => item.label === "Jardim Brasília")?.destination).toContain("Jardim Brasília");
  expect(preparePlannerDestinationResources("jardim brasilia", "centro").results.areas)
    .toHaveLength(1);
  expect(preparePlannerDestinationResources("jardim brasilia", "saude").results.areas).toHaveLength(0);
  expect(preparePlannerDestinationResources("", "centro", { area: "bairro-jardim-brasilia" }).results.areas)
    .toHaveLength(1);
  expect(listed.results.areas.every(item => !resolveReadyRouteStreetPoint(item.destination))).toBe(true);
});
