import { describe, expect, it } from "vitest";
import { projectMobilityForecast } from "./mobilityForecast";

describe("projectMobilityForecast", () => {
  it("projects round-trip cost and distance", () => {
    const result = projectMobilityForecast({
      oneWayDistanceKm: 10,
      oneWayTripCost: 5,
      tripsPerWeek: 5,
      roundTrip: true,
      fuelPricePerLiter: 5,
      monthlyBudget: 300,
    });

    expect(result.distancePerTripKm).toBe(20);
    expect(result.costPerTrip).toBe(10);
    expect(result.weeklyCost).toBe(50);
    expect(result.monthlyCost).toBeCloseTo(216.6667, 3);
    expect(result.monthlyDistanceKm).toBeCloseTo(433.3333, 3);
    expect(result.litersPerTrip).toBe(2);
    expect(result.monthlyLiters).toBeCloseTo(86.6667, 3);
    expect(result.budgetPercent).toBeCloseTo(72.2222, 3);
    expect(result.budgetRemaining).toBeCloseTo(83.3333, 3);
  });

  it("does not fabricate liters without a price", () => {
    const result = projectMobilityForecast({
      oneWayDistanceKm: 25,
      oneWayTripCost: 18,
      tripsPerWeek: 3,
      roundTrip: false,
      fuelPricePerLiter: null,
      monthlyBudget: null,
    });

    expect(result.litersPerTrip).toBeNull();
    expect(result.monthlyLiters).toBeNull();
    expect(result.costPerKm).toBeCloseTo(0.72);
    expect(result.budgetPercent).toBeNull();
  });
});
