import { describe, expect, it } from "vitest";
import { describeRouteData } from "./routeDataProvenance";

describe("describeRouteData", () => {
  it("marks all local inputs and route values explicitly", () => {
    const flags = describeRouteData({
      distanceMeters: 10000,
      durationSeconds: 1200,
      staticDurationSeconds: 1000,
      tollAmount: 8,
      tollEstimated: true,
      fuelPricePerLiter: 6,
      consumptionKmPerLiter: 12,
    });

    expect(flags.find(flag => flag.key === "distance")?.status).toBe("available");
    expect(flags.find(flag => flag.key === "traffic")?.status).toBe("available");
    expect(flags.find(flag => flag.key === "toll")?.status).toBe("estimated");
    expect(flags.find(flag => flag.key === "fuel")?.status).toBe("available");
    expect(flags.find(flag => flag.key === "total")?.status).toBe("available");
  });

  it("does not imply a total when toll is missing", () => {
    const flags = describeRouteData({
      distanceMeters: 10000,
      durationSeconds: 1200,
      staticDurationSeconds: null,
      tollAmount: null,
      tollEstimated: false,
      fuelPricePerLiter: 6,
      consumptionKmPerLiter: 12,
    });

    expect(flags.find(flag => flag.key === "traffic")?.status).toBe("missing");
    expect(flags.find(flag => flag.key === "toll")?.status).toBe("missing");
    expect(flags.find(flag => flag.key === "total")?.status).toBe("missing");
  });
});
