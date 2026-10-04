import { afterEach, describe, expect, it, vi } from "vitest";
import { findPreparedRouteByCoordinates, resolvePreparedRoutePoint, type OfflineRoute } from "./offlineStore";
import { calculateOfflineRoute } from "./publicRouting";
import { listOfflineRoutes } from "./offlineStore";

vi.mock("./offlineStore", async importOriginal => ({ ...await importOriginal<typeof import("./offlineStore")>(), listOfflineRoutes: vi.fn(async () => []) }));
afterEach(() => { vi.unstubAllGlobals(); vi.mocked(listOfflineRoutes).mockResolvedValue([]); });
const a = { lat: -15.75123, lng: -48.27123 };
const b = { lat: -15.76123, lng: -48.28123 };
const c = { lat: -15.77123, lng: -48.29123 };
const saved = (origin = "Ponto preparado A", destination = "Ponto preparado B", from = a, to = b, mode = "driving", source = "osrm"): OfflineRoute => ({
  id: origin + destination, origin, destination, savedAt: "2026-10-04T12:00:00Z",
  payload: { route: { origin: from, destination: to, source, mode, polyline: "r`d_B~~teHbwFg_mA", distanceLabel: "2 km", distanceMeters: 2000, durationSeconds: 240 }, stops: [], anpReferences: [] },
});

describe("prepared offline endpoints", () => {
  it("resolves named endpoints from either side of saved trips without geocoder storage", () => {
    expect(resolvePreparedRoutePoint([saved()], "ponto  preparado a")).toEqual(a);
    expect(resolvePreparedRoutePoint([saved()], "Ponto preparado B")).toEqual(b);
    expect(resolvePreparedRoutePoint([saved()], "preparado")).toBeNull();
  });
  it("refuses conflicting labels and private GPS labels", () => {
    expect(resolvePreparedRoutePoint([saved(), saved("Ponto preparado A", "Outro", c, b)], "Ponto preparado A")).toBeNull();
    expect(resolvePreparedRoutePoint([saved("Minha localização")], "Minha localização")).toBeNull();
    expect(findPreparedRouteByCoordinates([saved("Minha localização")], a, b, "driving")).toBeNull();
  });
  it("matches coordinates only in the same direction and travel mode", () => {
    expect(findPreparedRouteByCoordinates([saved()], a, b, "driving")?.origin).toBe("Ponto preparado A");
    expect(findPreparedRouteByCoordinates([saved()], b, a, "driving")).toBeNull();
    expect(findPreparedRouteByCoordinates([saved()], a, b, "walking")).toBeNull();
    expect(findPreparedRouteByCoordinates([saved("A", "B", a, b, "walking")], a, b, "walking")).toBeNull();
  });
  it("prefers saved street geometry over a newer estimate for the same endpoints", () => {
    const estimate = { ...saved("Alias A", "Alias B", a, b, "driving", "local-estimate"), savedAt: "2026-10-04T15:00:00Z" };
    expect(findPreparedRouteByCoordinates([estimate, saved()], a, b, "driving")?.origin).toBe("Ponto preparado A");
  });
  it.each(["driving", "walking", "cycling", "transit"] as const)("calculates a new %s estimate between independently prepared places without external requests", async mode => {
    vi.mocked(listOfflineRoutes).mockResolvedValue([saved(), saved("Ponto preparado B", "Ponto preparado C", b, c)]);
    const fetch = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("navigator", { onLine: false });
    const route = await calculateOfflineRoute("Ponto preparado A", "Ponto preparado C", mode);
    expect(route).toMatchObject({ origin: a, destination: c, mode, source: "local-estimate" });
    expect(route.steps).toBeUndefined();
    expect(fetch.mock.calls.some(([url]) => /nominatim|osrm|mapbox/.test(String(url)))).toBe(false);
  });
});
