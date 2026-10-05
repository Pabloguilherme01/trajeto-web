import { afterEach, expect, it, vi } from "vitest";
import { LOCAL_READY_ROUTES, READY_ROUTE_STATIONS, READY_ROUTE_STREET_POINTS } from "./localRoutePresets";
import { calculatePublicRoute, resetPublicRoutingTestState } from "./publicRouting";
import { buildReusableTripPlannerUrl } from "./tripLinks";
import { isAguasLindasRoutePoint } from "./mapGeometry";

afterEach(() => vi.unstubAllGlobals());
it("opens and calculates every ready city route without internet", async () => {
  resetPublicRoutingTestState();
  vi.stubGlobal("navigator", { onLine: false });
  const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
  vi.stubGlobal("fetch", fetchMock);
  expect(LOCAL_READY_ROUTES.length).toBeGreaterThan(232);
  expect(READY_ROUTE_STATIONS.length).toBeGreaterThan(0);
  expect(
    [...READY_ROUTE_STATIONS, ...READY_ROUTE_STREET_POINTS].every(point =>
      isAguasLindasRoutePoint(point)
    )
  ).toBe(true);
  expect(LOCAL_READY_ROUTES.some(route => route.category === "combustivel")).toBe(true);
  expect(LOCAL_READY_ROUTES.length).toBeGreaterThanOrEqual(650);
  const streetLabels = new Set(READY_ROUTE_STREET_POINTS.map(point => point.label));
  const streetPairs = LOCAL_READY_ROUTES.filter(route => streetLabels.has(route.originLabel) && streetLabels.has(route.destinationLabel));
  expect(streetPairs).toHaveLength((READY_ROUTE_STREET_POINTS.length * (READY_ROUTE_STREET_POINTS.length - 1)) / 2);
  expect(new Set(LOCAL_READY_ROUTES.map(route => route.id)).size).toBe(LOCAL_READY_ROUTES.length);
  const trips = LOCAL_READY_ROUTES.flatMap(route => [route, { ...route, origin: route.destination, destination: route.origin }]);
  const unavailable: string[] = [];
  for (const route of trips) for (const mode of ["driving", "walking", "cycling", "transit"] as const) {
    const url = new URL(buildReusableTripPlannerUrl(route, { auto: true }), "https://example.com");
    expect(url.searchParams.get("origem")).toBe(route.origin);
    expect(url.searchParams.get("destino")).toBe(route.destination);
    expect(url.searchParams.get("auto")).toBe("1");
    let result;
    try { result = await calculatePublicRoute(route.origin, route.destination, mode); }
    catch { unavailable.push(route.label); continue; }
    expect(result.source).toBe("local-estimate");
    expect(result.distanceMeters).toBeGreaterThanOrEqual(200);
    expect(result.origin).not.toEqual(result.destination);
  }
  expect(unavailable).toEqual([]);
  expect(fetchMock.mock.calls.every(([url]) => String(url).includes("aguas-lindas-offline-map.json"))).toBe(true);
  expect(fetchMock.mock.calls.some(([url]) => /nominatim|project-osrm|api\.mapbox/.test(String(url)))).toBe(false);
});
