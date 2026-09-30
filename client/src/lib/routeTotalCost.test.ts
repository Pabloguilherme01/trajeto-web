import { describe, expect, it } from "vitest";
import { calculateRouteTotalCost } from "./routeTotalCost";

describe("calculateRouteTotalCost", () => {
  it("combines fuel and toll for a round trip", () => {
    const result = calculateRouteTotalCost({
      distanceKm: 100,
      consumptionKmPerLiter: 10,
      fuelPricePerLiter: 6,
      tollAmount: 8,
      roundTrip: true,
    });

    expect(result.distanceKm).toBe(200);
    expect(result.liters).toBe(20);
    expect(result.fuelCost).toBe(120);
    expect(result.tollCost).toBe(16);
    expect(result.totalCost).toBe(136);
    expect(result.costPerKm).toBeCloseTo(0.68);
  });

  it("keeps missing toll transparent", () => {
    const result = calculateRouteTotalCost({
      distanceKm: 50,
      consumptionKmPerLiter: 10,
      fuelPricePerLiter: 6,
      tollAmount: null,
      roundTrip: false,
    });

    expect(result.fuelCost).toBe(30);
    expect(result.tollCost).toBeNull();
    expect(result.totalCost).toBe(30);
  });

  it("keeps explicit zero toll as zero", () => {
    const result = calculateRouteTotalCost({
      distanceKm: 50,
      consumptionKmPerLiter: 10,
      fuelPricePerLiter: 6,
      tollAmount: 0,
      roundTrip: false,
    });

    expect(result.tollCost).toBe(0);
    expect(result.totalCost).toBe(30);
  });
});
