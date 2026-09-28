import { describe, expect, it } from "vitest";
import { chooseAutomaticDailyMode } from "./dailyModes";

describe("dailyModes", () => {
  it("prioritizes offline continuation", () => {
    expect(chooseAutomaticDailyMode({ online: false, savedRoutes: 2, favoriteDestination: true, lastTrip: true, economy: true, intent: "route" })).toBe("offline");
  });
  it("prioritizes repeating a route when that is the active intent", () => {
    expect(chooseAutomaticDailyMode({ online: true, savedRoutes: 0, favoriteDestination: true, lastTrip: true, economy: false, intent: "route" })).toBe("repetir");
  });
  it("uses the frequent destination when available", () => {
    expect(chooseAutomaticDailyMode({ online: true, savedRoutes: 0, favoriteDestination: true, lastTrip: false, economy: false, intent: null })).toBe("proxima");
  });
  it("falls back to economy and then planning", () => {
    expect(chooseAutomaticDailyMode({ online: true, savedRoutes: 0, favoriteDestination: false, lastTrip: false, economy: true, intent: null })).toBe("economia");
    expect(chooseAutomaticDailyMode({ online: true, savedRoutes: 0, favoriteDestination: false, lastTrip: false, economy: false, intent: null })).toBe("proxima");
  });
});
