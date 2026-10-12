import { expect, it } from "vitest";
import type { OfflineRoute } from "./offlineStore";
import { filterPreparedDestinations } from "./preparedDestinationRoutes";
import type { LocalRoutePreset } from "./localRoutePresets";

const places: LocalRoutePreset[] = [
  { id: "a", label: "UPA", detail: "Saúde", category: "saude", destination: "UPA Águas Lindas" },
  { id: "b", label: "Centro", detail: "Cidade", category: "centro", destination: "Centro Águas Lindas" },
];
function saved(destination: string, source: string, polyline: string, mode: string = "driving"): OfflineRoute {
  return { id: "test-" + destination, origin: "Prefeitura", destination, savedAt: "2026-10-11T10:00:00Z",
    payload: { route: { mode, source, polyline, distanceMeters: 5000, durationSeconds: 500, distanceLabel: "5 km" }, stops: [], anpReferences: [] } };
}
it("requires an exact saved trip and actual road geometry, not a point or an estimate", () => {
  const routes = [saved("UPA Águas Lindas", "offline-road", "encoded"), saved("Centro Águas Lindas", "local-estimate", "")];
  expect(filterPreparedDestinations(places, routes, "Prefeitura", "driving").map(x => x.id)).toEqual(["a"]);
  expect(filterPreparedDestinations(places, routes, "Outra origem", "driving")).toEqual([]);
  expect(filterPreparedDestinations(places, routes, "Prefeitura", "walking")).toEqual([]);
  expect(filterPreparedDestinations(places, routes, "", "driving")).toEqual([]);
  expect(filterPreparedDestinations(places, [saved("UPA Águas Lindas", "osrm", "")], "Prefeitura", "driving")).toEqual([]);
});
