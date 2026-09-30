import { describe, expect, it } from "vitest";
import { calculateRouteDecisionValue } from "./routeDecisionValue";

describe("calculateRouteDecisionValue", () => {
  it("combines money and time value", () => {
    const result = calculateRouteDecisionValue(3, -10, 30);
    expect(result.timeCost).toBeCloseTo(-5);
    expect(result.combinedDelta).toBeCloseTo(-2);
  });

  it("keeps the comparison financial-only when time value is absent", () => {
    const result = calculateRouteDecisionValue(3, -10, 0);
    expect(result.timeCost).toBeNull();
    expect(result.combinedDelta).toBe(3);
  });

  it("does not invent combined cost when financial cost is missing", () => {
    expect(calculateRouteDecisionValue(null, -10, 30).combinedDelta).toBeNull();
  });
});
