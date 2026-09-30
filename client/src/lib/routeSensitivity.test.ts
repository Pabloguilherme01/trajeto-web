import { describe, expect, it } from "vitest";
import { calculateFuelBreakEvenPrice, routeCostAtFuelPrice } from "./routeSensitivity";

describe("routeSensitivity", () => {
  const baseline = { distanceKm: 100, tollAmount: 10, consumptionKmPerLiter: 10 };
  const alternative = { distanceKm: 120, tollAmount: 0, consumptionKmPerLiter: 10 };

  it("calculates route cost at a simulated fuel price", () => {
    expect(routeCostAtFuelPrice(baseline, 5)).toBe(60);
  });

  it("finds the fuel price where two routes break even", () => {
    expect(calculateFuelBreakEvenPrice(baseline, alternative)).toBe(5);
  });

  it("does not invent a break-even point without a valid crossing", () => {
    expect(calculateFuelBreakEvenPrice(
      { distanceKm: 100, tollAmount: 0, consumptionKmPerLiter: 10 },
      { distanceKm: 120, tollAmount: 0, consumptionKmPerLiter: 10 },
    )).toBeNull();
    expect(routeCostAtFuelPrice(
      { distanceKm: 100, tollAmount: null, consumptionKmPerLiter: 10 },
      5,
    )).toBeNull();
  });
});
