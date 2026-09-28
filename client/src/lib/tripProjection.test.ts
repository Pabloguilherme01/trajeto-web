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
    expect(result.costPerTrip).toBe(50);
    expect(result.weeklyCost).toBe(250);
    expect(result.monthlyCost).toBeCloseTo(1082.5);
    expect(result.annualCost).toBeCloseTo(12990);
  });

  it("limita frequência inválida sem produzir valores negativos", () => {
    const result = projectTripCosts({
      oneWayDistanceKm: -10,
      oneWayCost: -5,
      roundTrip: false,
      tripsPerWeek: 99,
    });

    expect(result.distanceKm).toBe(0);
    expect(result.costPerTrip).toBe(0);
    expect(result.weeklyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
  });
});
