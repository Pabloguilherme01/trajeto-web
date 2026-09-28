import { describe, expect, it } from "vitest";
import { compareTripScenarios, projectTripCosts } from "@/lib/tripProjection";

describe("local route calculator contract", () => {
  it("projects a round trip without negative values", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 35,
      oneWayCost: (35 / 10) * 5.89,
      roundTrip: true,
      tripsPerWeek: 5,
    });

    expect(result.distanceKm).toBe(70);
    expect(result.costPerTrip).toBeCloseTo(41.23, 1);
    expect(result.costPerKm).toBeCloseTo(0.589, 3);
    expect(result.weeklyCost).toBeCloseTo(206.15, 1);
    expect(result.monthlyCost).toBeGreaterThan(result.weeklyCost);
    expect(result.annualCost).toBeGreaterThan(result.monthlyCost);
  });

  it("inclui pedágio e estacionamento no custo total", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 35,
      oneWayCost: (35 / 10) * 5.89,
      roundTrip: true,
      tripsPerWeek: 5,
      extraCostPerTrip: 18,
    });

    expect(result.fuelCostPerTrip).toBeCloseTo(41.23, 1);
    expect(result.extraCostPerTrip).toBe(18);
    expect(result.costPerTrip).toBeCloseTo(59.23, 1);
    expect(result.weeklyCost).toBeCloseTo(296.15, 1);
  });

  it("clamps an invalid weekly frequency", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 35,
      oneWayCost: 20,
      roundTrip: false,
      tripsPerWeek: 99,
    });

    expect(result.weeklyCost).toBe(420);
  });

  it("keeps a zero-frequency projection at zero", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 20,
      oneWayCost: 12,
      roundTrip: true,
      tripsPerWeek: 0,
    });

    expect(result.weeklyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
    expect(result.annualCost).toBe(0);
  });

  it("compara dois cenários usando o mesmo percurso e extras", () => {
    const result = compareTripScenarios({
      oneWayDistanceKm: 35,
      baselinePricePerLiter: 5.89,
      baselineKmPerLiter: 10,
      alternativePricePerLiter: 5.49,
      alternativeKmPerLiter: 8.5,
      roundTrip: true,
      tripsPerWeek: 5,
      extraCostPerTrip: 18,
    });

    expect(result).not.toBeNull();
    expect(result?.baseline.costPerTrip).toBeCloseTo(59.23, 1);
    expect(result?.alternative.costPerTrip).toBeCloseTo(63.22, 1);
    expect(result?.differencePerTrip).toBeCloseTo(-3.99, 1);
    expect(result?.differencePerMonth).toBeCloseTo(-86.4, 1);
  });

  it("não compara cenário incompleto", () => {
    expect(compareTripScenarios({
      oneWayDistanceKm: 35,
      baselinePricePerLiter: 5.89,
      baselineKmPerLiter: 10,
      alternativePricePerLiter: 0,
      alternativeKmPerLiter: 8.5,
      roundTrip: true,
      tripsPerWeek: 5,
    })).toBeNull();
  });

});
