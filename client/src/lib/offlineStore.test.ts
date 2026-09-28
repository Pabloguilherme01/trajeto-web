import { describe, expect, it } from "vitest";
import { findOfflineRouteByDestination, findOfflineRouteByTrip, isOfflineRouteStale, offlineRouteId } from "./offlineStore";

describe("offlineStore helpers", () => {
  it("normalizes route ids consistently", () => {
    expect(offlineRouteId("  Águas Lindas ", " Brasília ")).toBe("águas lindas::brasília");
  });

  it("finds a saved route by destination without case sensitivity", () => {
    const routes = [
      { id: "1", origin: "Casa", destination: "Brasília", savedAt: new Date().toISOString(), payload: {} },
      { id: "2", origin: "Casa", destination: "Anápolis", savedAt: new Date().toISOString(), payload: {} },
    ];

    expect(findOfflineRouteByDestination(routes, " brasília ")?.id).toBe("1");
  });

  it("finds an exact saved trip instead of a destination-only match", () => {
    const routes = [
      { id: "1", origin: "Casa", destination: "Brasília", savedAt: new Date().toISOString(), payload: {} },
      { id: "2", origin: "Trabalho", destination: "Brasília", savedAt: new Date().toISOString(), payload: {} },
    ];

    expect(findOfflineRouteByTrip(routes, " trabalho ", " BRASÍLIA ")?.id).toBe("2");
    expect(findOfflineRouteByTrip(routes, "Outro", "Brasília")).toBeNull();
  });

  it("marks invalid timestamps as stale", () => {
    expect(isOfflineRouteStale("not-a-date")).toBe(true);
  });

  it("marks a route stale only after the configured age", () => {
    const now = Date.parse("2026-09-28T12:00:00.000Z");
    const fresh = new Date(now - 71 * 60 * 60 * 1000).toISOString();
    const stale = new Date(now - 73 * 60 * 60 * 1000).toISOString();

    expect(isOfflineRouteStale(fresh, now)).toBe(false);
    expect(isOfflineRouteStale(stale, now)).toBe(true);
  });
});
