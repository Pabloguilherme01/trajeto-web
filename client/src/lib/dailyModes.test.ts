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
  it("does not serialize private origins in repeat and driving modes", () => {
    localStorage.setItem("trajeto-last-trip", JSON.stringify({
      origin: "Minha localização",
      destination: "Hospital",
      usedAt: new Date().toISOString(),
    }));

    const modes = buildDailyModes(true, 0);
    const repeat = modes.find(mode => mode.id === "repetir");
    const driving = modes.find(mode => mode.id === "conducao");

    expect(repeat?.href).toContain("destino=Hospital");
    expect(repeat?.href).not.toContain("origem=");
    expect(repeat?.href).not.toContain("Minha");
    expect(driving?.href).toContain("conducao=1");
    expect(driving?.href).not.toContain("origem=");
  });

});
