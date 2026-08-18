import { describe, expect, it } from "vitest";
import { officialRouteSources, routeBoundingBox } from "./routeTraffic";

describe("route traffic status", () => {
  it("keeps official sources visible and bounds the route query to a compact area", () => {
    expect(officialRouteSources).toHaveLength(3);
    expect(officialRouteSources.map(source => source.label)).toEqual(["Detran-DF", "PRF", "DNIT"]);
    expect(routeBoundingBox({ lat: -15.8, lng: -48.0 }, { lat: -15.7, lng: -47.8 })).toBe("-48.08,-15.88,-47.72,-15.62");
  });
});
