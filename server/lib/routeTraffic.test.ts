import { describe, expect, it } from "vitest";
import { filterActionableTrafficItems, officialRouteSources, routeBoundingBox } from "./routeTraffic";

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
});
