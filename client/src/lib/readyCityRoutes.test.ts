import { afterEach, expect, it, vi } from "vitest";
import { LOCAL_READY_ROUTES } from "./localRoutePresets";
import { calculatePublicRoute, resetPublicRoutingTestState } from "./publicRouting";
import { buildReusableTripPlannerUrl } from "./tripLinks";

afterEach(() => vi.unstubAllGlobals());
it("opens and calculates every ready city route without internet", async () => {
  resetPublicRoutingTestState();
  vi.stubGlobal("navigator", { onLine: false });
  const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
  vi.stubGlobal("fetch", fetchMock);
  expect(LOCAL_READY_ROUTES.length).toBeGreaterThanOrEqual(10);
  expect(new Set(LOCAL_READY_ROUTES.map(route => route.id)).size).toBe(LOCAL_READY_ROUTES.length);
  for (const route of LOCAL_READY_ROUTES) {
    const url = new URL(buildReusableTripPlannerUrl(route, { auto: true }), "https://example.com");
    expect(url.searchParams.get("origem")).toBe(route.origin);
    expect(url.searchParams.get("destino")).toBe(route.destination);
    expect(url.searchParams.get("auto")).toBe("1");
    const result = await calculatePublicRoute(route.origin, route.destination);
    expect(result.source).toBe("local-estimate");
    expect(result.distanceMeters).toBeGreaterThan(200);
    expect(result.origin).not.toEqual(result.destination);
  }
  expect(fetchMock).not.toHaveBeenCalled();
});
