import { describe, expect, it } from "vitest";
import { calculateDepartureTime } from "./arrivalPlanner";

describe("calculateDepartureTime", () => {
  const now = new Date("2026-09-30T12:00:00");

  it("calculates a departure time for today", () => {
    const result = calculateDepartureTime("14:00", "today", 3600, 15, now);
    expect(result?.departure.getHours()).toBe(12);
    expect(result?.departure.getMinutes()).toBe(45);
    expect(result?.totalPlanningMinutes).toBe(75);
  });

  it("supports tomorrow without changing the route duration", () => {
    const result = calculateDepartureTime("08:00", "tomorrow", 1800, 10, now);
    expect(result?.departure.getDate()).toBe(1);
    expect(result?.departure.getHours()).toBe(7);
    expect(result?.departure.getMinutes()).toBe(20);
  });

  it("rejects invalid time and duration", () => {
    expect(calculateDepartureTime("25:00", "today", 1800, 0, now)).toBeNull();
    expect(calculateDepartureTime("08:00", "today", -1, 0, now)).toBeNull();
  });
});
