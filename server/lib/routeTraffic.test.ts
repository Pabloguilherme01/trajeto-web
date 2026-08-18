import { describe, expect, it } from "vitest";
import { officialRouteSources, routeTrafficStatus } from "./routeTraffic";

describe("route traffic status", () => {
  it("keeps official sources visible even when live traffic is pending", () => {
    expect(routeTrafficStatus().officialSources).toHaveLength(3);
    expect(officialRouteSources.map(source => source.label)).toEqual(["Detran-DF", "PRF", "DNIT"]);
  });
});
