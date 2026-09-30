import { describe, expect, it } from "vitest";
import { buildTripChecklist } from "./tripChecklist";

describe("buildTripChecklist", () => {
  it("marks a confirmed route as ready when inputs are complete", () => {
    const items = buildTripChecklist({
      routeAvailable: true,
      routeConfirmed: true,
      distanceKm: 40,
      durationSeconds: 2400,
      online: true,
      loadedFromOffline: false,
      vehicleConsumption: 12,
      vehicleTankLiters: 50,
      tollKnown: true,
      fuelPriceConfigured: true,
    });

    expect(items.every(item => item.status === "ready")).toBe(true);
  });

  it("flags stale offline data and insufficient autonomy", () => {
    const items = buildTripChecklist({
      routeAvailable: true,
      routeConfirmed: false,
      distanceKm: 500,
      durationSeconds: 20000,
      online: false,
      loadedFromOffline: true,
      vehicleConsumption: 10,
      vehicleTankLiters: 30,
      tollKnown: false,
      fuelPriceConfigured: false,
    });

    expect(items.find(item => item.key === "route")?.status).toBe("attention");
    expect(items.find(item => item.key === "navigation")?.status).toBe("attention");
    expect(items.find(item => item.key === "dataFreshness")?.status).toBe("attention");
    expect(items.find(item => item.key === "fuelRange")?.status).toBe("attention");
    expect(items.filter(item => item.status === "attention").length).toBe(6);
  });
});
