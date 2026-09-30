import { describe, expect, it } from "vitest";
import { calculateRecurringRouteImpact } from "./routeRecurringImpact";

describe("calculateRecurringRouteImpact", () => {
  it("projects a recurring route difference", () => {
    const result = calculateRecurringRouteImpact(2.5, -5, 4);
    expect(result?.weeklyDelta).toBe(10);
    expect(result?.monthlyDelta).toBeCloseTo(43.3333);
    expect(result?.annualDelta).toBe(520);
    expect(result?.monthlyMinutesDelta).toBeCloseTo(-86.6667);
    expect(result?.costPerMinuteSaved).toBeCloseTo(0.5);
  });

  it("clamps the weekly trip input", () => {
    expect(calculateRecurringRouteImpact(1, 1, 40)?.weeklyDelta).toBe(14);
    expect(calculateRecurringRouteImpact(1, 1, 0)).toBeNull();
  });

  it("does not show an additional cost when the faster route is also cheaper", () => {
    expect(calculateRecurringRouteImpact(-1, -3, 5)?.costPerMinuteSaved).toBeNull();
  });

  it("does not invent an impact when route cost is incomplete", () => {
    expect(calculateRecurringRouteImpact(null, -3, 5)).toBeNull();
  });
});
