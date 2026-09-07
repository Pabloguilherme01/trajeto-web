import { describe, expect, it } from "vitest";
import { isAlertTimeSlot } from "./routeAlerts";

describe("route alert preferences", () => {
  it("accepts only the explicit time slots used in the consent flow", () => {
    expect(isAlertTimeSlot("morning")).toBe(true);
    expect(isAlertTimeSlot("anytime")).toBe(true);
    expect(isAlertTimeSlot("overnight")).toBe(false);
  });
});
