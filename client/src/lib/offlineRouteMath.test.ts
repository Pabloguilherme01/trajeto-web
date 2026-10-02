import { describe, expect, it } from "vitest";
import { distanceKm, rankNearbyStops, straightLineRoute } from "./offlineRouteMath";
import { externalNavigationUrl, findOfflineRouteByTrip, isOfflineRouteStale, wazeNavigationUrl, type OfflineRoute } from "./offlineStore";

describe("offline route math", () => {
  it("returns zero for identical points", () => {
    expect(distanceKm({ lat: -15.7612, lng: -48.2812 }, { lat: -15.7612, lng: -48.2812 })).toBe(0);
  });

  it("estimates a local straight-line route with an explicit warning", () => {
    const result = straightLineRoute(
      { lat: -15.7612, lng: -48.2812 },
      { lat: -15.7901, lng: -48.2602 },
    );

    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.source).toBe("estimativa local");
    expect(result.warning).toContain("Sem internet");
  });

  it("ranks nearby stops by distance and respects the limit", () => {
    const destination = { lat: -15.7612, lng: -48.2812 };
    const stops = [
      { lat: -15.9000, lng: -48.4000, name: "longe" },
      { lat: -15.7620, lng: -48.2820, name: "perto" },
      { lat: -15.8000, lng: -48.3000, name: "meio" },
    ];

    const result = rankNearbyStops(destination, stops, 2);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("perto");
    expect(result[1].name).toBe("meio");
  });
});

describe("offline route reuse", () => {
  const routes = [
    {
      id: "a",
      origin: "Águas Lindas de Goiás",
      destination: "Brasília, DF",
      savedAt: new Date().toISOString(),
      payload: {
        route: { distanceLabel: "45 km", distanceMeters: 45000, durationSeconds: 3600 },
        stops: [],
        anpReferences: [],
      },
    },
  ] as OfflineRoute[];

  it("matches a saved route by origin and destination without case sensitivity", () => {
    expect(findOfflineRouteByTrip(routes, "águas lindas de goiás", "BRASÍLIA, DF")?.id).toBe("a");
    expect(findOfflineRouteByTrip(routes, "Goiânia", "Brasília, DF")).toBeNull();
  });

  it("builds external navigation with both origin and destination", () => {
    const url = externalNavigationUrl(routes[0]);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("origin")).toBe("Águas Lindas de Goiás");
    expect(parsed.searchParams.get("destination")).toBe("Brasília, DF");
    expect(url).toContain("travelmode=driving");
  });

  it("builds a Waze destination link with encoded destination", () => {
    const url = wazeNavigationUrl(routes[0]);
    expect(url).toBe("https://www.waze.com/ul?q=Bras%C3%ADlia%2C%20DF&navigate=yes");
  });

  it("marks snapshots older than 72 hours as stale", () => {
    const now = Date.parse("2026-09-28T12:00:00.000Z");
    expect(isOfflineRouteStale("2026-09-25T11:59:59.000Z", now)).toBe(true);
    expect(isOfflineRouteStale("2026-09-25T12:00:00.000Z", now)).toBe(false);
  });
});
