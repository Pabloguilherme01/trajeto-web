import { describe, expect, it } from "vitest";
import { filterActionableTrafficItems, filterIncidentsByMinimumDelay, officialRouteSources, routeBoundingBox, routeTrafficAreaStatus } from "./routeTraffic";

describe("route traffic status", () => {
  it("keeps official sources visible and bounds the route query to a compact area", () => {
    expect(officialRouteSources).toHaveLength(3);
    expect(officialRouteSources.map(source => source.label)).toEqual(["Detran-DF", "PRF", "DNIT"]);
    expect(routeBoundingBox({ lat: -15.8, lng: -48.0 }, { lat: -15.7, lng: -47.8 })).toBe("-48.08,-15.88,-47.72,-15.62");
  });

  it("keeps only recent incidents with operational impact and excludes closed records", () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    const incidents = filterActionableTrafficItems([
      { properties: { id: "recent", delay: 180, magnitudeOfDelay: 2, lastReportTime: "2026-08-18T11:50:00.000Z", events: [{ description: "Obra na pista" }] } },
      { properties: { id: "closed", delay: 300, magnitudeOfDelay: 3, lastReportTime: "2026-08-18T11:50:00.000Z", events: [{ description: "Encerrado/a" }] } },
      { properties: { id: "stale", delay: 180, magnitudeOfDelay: 2, lastReportTime: "2026-08-15T10:00:00.000Z", events: [{ description: "Lentidão" }] } },
      { properties: { id: "no-delay", delay: 0, lastReportTime: "2026-08-18T11:50:00.000Z", events: [{ description: "Fluxo normal" }] } },
    ], now);
    expect(incidents.map(item => item.properties?.id)).toEqual(["recent"]);
  });

  it("applies a per-corridor minimum delay without hiding alerts when the user accepts any delay", () => {
    const incidents = [{ delaySeconds: 180 }, { delaySeconds: 600 }, { delaySeconds: null }];
    expect(filterIncidentsByMinimumDelay(incidents, 0)).toHaveLength(3);
    expect(filterIncidentsByMinimumDelay(incidents, 5)).toEqual([{ delaySeconds: 600 }]);
    expect(filterIncidentsByMinimumDelay(incidents, 15)).toEqual([]);
  });

  it("returns a non-live state instead of calling an unconfigured provider", async () => {
    const previous = process.env.TOMTOM_API_KEY;
    try {
      delete process.env.TOMTOM_API_KEY;
      const result = await routeTrafficAreaStatus({ lat: -15.76, lng: -48.28 });
      expect(result.state).toBe("pending");
      expect(result.incidents).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.TOMTOM_API_KEY;
      else process.env.TOMTOM_API_KEY = previous;
    }
  });
});
