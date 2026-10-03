import { describe, expect, it } from "vitest";
import {
  calculateDepartureTime,
  defaultArrivalTarget,
  describeDepartureStatus,
  departureMinutesDelta,
  parseLocalTime,
} from "./arrivalPlanner";

describe("arrivalPlanner", () => {
  const now = new Date(2026, 9, 3, 18, 0, 0);

  it("calculates the departure from route duration and the user's margin", () => {
    const result = calculateDepartureTime("19:00", "today", 30 * 60, 10, now);
    expect(result).not.toBeNull();
    expect(result?.arrival.getHours()).toBe(19);
    expect(result?.departure.getHours()).toBe(18);
    expect(result?.departure.getMinutes()).toBe(20);
    expect(result?.totalPlanningMinutes).toBe(40);
  });

  it("keeps tomorrow on the following local calendar day", () => {
    const target = parseLocalTime("07:15", "tomorrow", now);
    expect(target?.getDate()).toBe(4);
    expect(target?.getHours()).toBe(7);
    expect(target?.getMinutes()).toBe(15);
  });

  it("moves the default target to tomorrow when one hour crosses midnight", () => {
    const late = new Date(2026, 9, 3, 23, 20, 0);
    expect(defaultArrivalTarget(late)).toEqual({ time: "00:20", day: "tomorrow" });
  });

  it("rejects invalid times and invalid route durations", () => {
    expect(parseLocalTime("25:10", "today", now)).toBeNull();
    expect(calculateDepartureTime("19:00", "today", 0, 10, now)).toBeNull();
  });

  it("classifies the departure window without pretending to know traffic", () => {
    const future = new Date(2026, 9, 3, 18, 15, 0);
    const due = new Date(2026, 9, 3, 18, 0, 30);
    const late = new Date(2026, 9, 3, 17, 55, 0);
    expect(describeDepartureStatus(future, now)).toBe("upcoming");
    expect(describeDepartureStatus(due, now)).toBe("due");
    expect(describeDepartureStatus(late, now)).toBe("late");
    expect(departureMinutesDelta(future, now)).toBe(15);
  });
});
