import { describe, expect, it } from "vitest";
import { projectTripCosts } from "./tripProjection";

describe("projectTripCosts", () => {
  it("calcula ida e volta e projeção semanal e mensal", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 50,
      oneWayCost: 25,
      roundTrip: true,
      tripsPerWeek: 5,
    });

    expect(result.distanceKm).toBe(100);
    expect(result.fuelCostPerTrip).toBe(50);
    expect(result.extraCostPerTrip).toBe(0);
    expect(result.costPerTrip).toBe(50);
    expect(result.costPerKm).toBe(0.5);
    expect(result.weeklyCost).toBe(250);
    expect(result.monthlyCost).toBeCloseTo(1082.5);
    expect(result.annualCost).toBeCloseTo(12990);
  });

  it("inclui custos extras por viagem", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: 40,
      oneWayCost: 20,
      roundTrip: true,
      tripsPerWeek: 3,
      extraCostPerTrip: 12.5,
    });

    expect(result.distanceKm).toBe(80);
    expect(result.fuelCostPerTrip).toBe(40);
    expect(result.extraCostPerTrip).toBe(12.5);
    expect(result.costPerTrip).toBe(52.5);
    expect(result.costPerKm).toBeCloseTo(0.65625);
    expect(result.weeklyCost).toBe(157.5);
    expect(result.monthlyCost).toBeCloseTo(681.975);
  });

  it("limita frequência inválida sem produzir valores negativos", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: -10,
      oneWayCost: -5,
      roundTrip: false,
      tripsPerWeek: 99,
      extraCostPerTrip: -10,
    });

    expect(result.distanceKm).toBe(0);
    expect(result.costPerTrip).toBe(0);
    expect(result.costPerKm).toBe(0);
    expect(result.weeklyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
  });
});
