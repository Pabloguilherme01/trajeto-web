import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateOfflineRoadRoute, resetOfflineRoadRoutingForTests } from "./offlineRoadRouting";

afterEach(() => {
  vi.unstubAllGlobals();
  resetOfflineRoadRoutingForTests();
});

function mockRoadPack() {
  const pack = {
    schema: 1,
    retrievedAt: "2026-10-04T00:00:00Z",
    roads: [
      {
        id: 1,
        kind: "residential",
        name: "Rua A",
        points: [
          [-15.7500, -48.2800],
          [-15.7500, -48.2790],
          [-15.7500, -48.2780],
        ],
      },
      {
        id: 2,
        kind: "residential",
        name: "Rua B",
        points: [
          [-15.7500, -48.2780],
          [-15.7510, -48.2780],
          [-15.7520, -48.2780],
        ],
      },
      {
        id: 3,
        kind: "trunk",
        name: "Via rápida",
        points: [
          [-15.7500, -48.2800],
          [-15.7510, -48.2790],
          [-15.7520, -48.2780],
        ],
      },
    ],
  };
  const fetch = vi.fn(async () => ({
    ok: true,
    json: async () => pack,
  }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("offline road routing", () => {
  it("builds street geometry and grouped guidance without external routing", async () => {
    const fetch = mockRoadPack();
    const route = await calculateOfflineRoadRoute(
      { lat: -15.75002, lng: -48.28002 },
      { lat: -15.75202, lng: -48.27802 },
      "driving"
    );
    expect(route).not.toBeNull();
    expect(route!.points.length).toBeGreaterThan(2);
    expect(route!.distanceMeters).toBeGreaterThan(100);
    expect(route!.steps.some(step => step.name === "Via rápida")).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain("aguas-lindas-offline-map.json");
  });

  it("keeps walking away from trunk-only segments and uses mapped local streets", async () => {
    mockRoadPack();
    const route = await calculateOfflineRoadRoute(
      { lat: -15.75002, lng: -48.28002 },
      { lat: -15.75202, lng: -48.27802 },
      "walking"
    );
    expect(route).not.toBeNull();
    expect(route!.steps.some(step => step.name === "Via rápida")).toBe(false);
    expect(route!.steps.some(step => step.name === "Rua A")).toBe(true);
    expect(route!.steps.some(step => step.name === "Rua B")).toBe(true);
  });

  it("returns null when an endpoint is too far from the saved street mesh", async () => {
    mockRoadPack();
    const route = await calculateOfflineRoadRoute(
      { lat: -15.70, lng: -48.35 },
      { lat: -15.752, lng: -48.278 },
      "driving"
    );
    expect(route).toBeNull();
  });
});
