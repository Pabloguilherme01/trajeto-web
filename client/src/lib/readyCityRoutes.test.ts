import { afterEach, expect, it, vi } from "vitest";
import { LOCAL_READY_ROUTES, READY_ROUTE_STATIONS, READY_ROUTE_STREET_POINTS } from "./localRoutePresets";
import { calculatePublicRoute, resetPublicRoutingTestState, resolveOfflineRoutePoint } from "./publicRouting";
import { buildReusableTripPlannerUrl } from "./tripLinks";
import { isAguasLindasRoutePoint } from "./mapGeometry";

afterEach(() => vi.unstubAllGlobals());

it("opens every ready city route offline and samples calculations by category", async () => {
  resetPublicRoutingTestState();
  vi.stubGlobal("navigator", { onLine: false });
  const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
  vi.stubGlobal("fetch", fetchMock);

  expect(READY_ROUTE_STATIONS.length).toBeGreaterThan(0);
  expect(
    [...READY_ROUTE_STATIONS, ...READY_ROUTE_STREET_POINTS].every(point =>
      isAguasLindasRoutePoint(point)
    )
  ).toBe(true);
  expect(LOCAL_READY_ROUTES.length).toBeGreaterThanOrEqual(2500);
  expect(READY_ROUTE_STREET_POINTS.length).toBe(50);
  for (const hospital of ["upa", "heal", "hospital-bom-jesus"]) {
    expect(READY_ROUTE_STATIONS.every(station => LOCAL_READY_ROUTES.some(route => route.id === `${hospital}-to-${station.id}`))).toBe(true);
  }
  expect(LOCAL_READY_ROUTES.some(route => route.category === "combustivel")).toBe(true);
  expect(
    LOCAL_READY_ROUTES.some(
      route =>
        route.originId.startsWith("ready-station-") &&
        route.destinationLabel.includes("Avenida")
    )
  ).toBe(true);
  expect(
    LOCAL_READY_ROUTES.some(
      route =>
        route.originId.startsWith("ready-station-") &&
        route.id.includes("-to-ready-station-")
    )
  ).toBe(true);

  const streetLabels = new Set(READY_ROUTE_STREET_POINTS.map(point => point.label));
  const streetPairs = LOCAL_READY_ROUTES.filter(
    route =>
      streetLabels.has(route.originLabel) &&
      streetLabels.has(route.destinationLabel)
  );
  expect(streetPairs).toHaveLength(
    (READY_ROUTE_STREET_POINTS.length * (READY_ROUTE_STREET_POINTS.length - 1)) /
      2
  );
  expect(new Set(LOCAL_READY_ROUTES.map(route => route.id)).size).toBe(
    LOCAL_READY_ROUTES.length
  );

  for (const route of LOCAL_READY_ROUTES) {
    const url = new URL(
      buildReusableTripPlannerUrl(route, { auto: true }),
      "https://example.com"
    );
    expect(url.searchParams.get("origem")).toBe(route.origin);
    expect(url.searchParams.get("destino")).toBe(route.destination);
    expect(url.searchParams.get("auto")).toBe("1");
    const origin = resolveOfflineRoutePoint(route.origin);
    const destination = resolveOfflineRoutePoint(route.destination);
    expect(origin, route.label + " sem origem offline").not.toBeNull();
    expect(destination, route.label + " sem destino offline").not.toBeNull();
    expect(origin).not.toEqual(destination);
  }

  const categorySamples = [
    ...new Map(
      LOCAL_READY_ROUTES.map(route => [route.category, route] as const)
    ).values(),
  ];
  for (const route of categorySamples) {
    for (const mode of ["driving", "walking", "cycling", "transit"] as const) {
      const result = await calculatePublicRoute(route.origin, route.destination, mode);
      expect(result.source).toBe("local-estimate");
      expect(result.distanceMeters).toBeGreaterThanOrEqual(200);
      expect(result.origin).not.toEqual(result.destination);
    }
  }

  expect(
    fetchMock.mock.calls.every(([url]) =>
      String(url).includes("aguas-lindas-offline-map.json")
    )
  ).toBe(true);
  expect(
    fetchMock.mock.calls.some(([url]) =>
      /nominatim|project-osrm|api\.mapbox/.test(String(url))
    )
  ).toBe(false);
});
