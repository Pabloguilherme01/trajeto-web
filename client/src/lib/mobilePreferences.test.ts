// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearRecentTrips, getRecentSearches, getRecentTrips, rememberSearch, rememberTrip, getRouteUsageStats, removeRecentTrip } from "./mobilePreferences";

describe("mobilePreferences recent trips", () => {
  beforeEach(() => localStorage.clear());

  it("keeps unique trips with the newest trip first", () => {
    rememberTrip("Casa", "Trabalho");
    rememberTrip("Casa", "Shopping");
    rememberTrip("Casa", "Trabalho");
    const trips = getRecentTrips();
    expect(trips).toHaveLength(2);
    expect(trips[0]).toMatchObject({ origin: "Casa", destination: "Trabalho" });
    expect(trips[1]).toMatchObject({ origin: "Casa", destination: "Shopping" });
  });

  it("limits history to twenty trips", () => {
    for (let index = 0; index < 22; index += 1) rememberTrip("Origem " + index, "Destino " + index);
    const trips = getRecentTrips();
    expect(trips).toHaveLength(20);
    expect(trips[0].destination).toBe("Destino 21");
    expect(trips.at(-1)?.destination).toBe("Destino 2");
  });

  it("removes one trip and can clear the history", () => {
    rememberTrip("Casa", "Trabalho");
    rememberTrip("Casa", "Mercado");
    removeRecentTrip("Casa", "Trabalho");
    expect(getRecentTrips()).toHaveLength(1);
    expect(getRecentTrips()[0].destination).toBe("Mercado");
    clearRecentTrips();
    expect(getRecentTrips()).toEqual([]);
  });

  it("ignores invalid trip input", () => {
    rememberTrip("a", "b");
    expect(getRecentTrips()).toEqual([]);
  });

  it("never persists a precise GPS origin in trip history", () => {
    rememberTrip("-15.76123, -48.28123", "Hospital");
    const trips = getRecentTrips();
    expect(trips[0]?.origin).toBe("Minha localização");
    expect(localStorage.getItem("trajeto-recent-trips")).not.toContain("-15.76123");
  });
});

describe("mobilePreferences search privacy", () => {
  beforeEach(() => localStorage.clear());

  it("does not keep GPS or current-location labels in recent searches", () => {
    rememberSearch("-15.76123, -48.28123");
    rememberSearch("Minha localização");
    expect(getRecentSearches()).toEqual([]);
    expect(localStorage.getItem("trajeto-recent-searches")).toBeNull();
  });

  it("removes legacy private-location entries from recent searches", () => {
    localStorage.setItem(
      "trajeto-recent-searches",
      JSON.stringify(["Minha localização", "-15.76123, -48.28123", "Hospital"])
    );
    expect(getRecentSearches()).toEqual(["Hospital"]);
  });
});

describe("mobilePreferences route usage", () => {
  beforeEach(() => localStorage.clear());

  it("migrates legacy usage keys that contain precise coordinates", () => {
    localStorage.setItem(
      "trajeto-route-usage",
      JSON.stringify({ "-15.76123, -48.28123::hospital": 3 })
    );
    localStorage.setItem(
      "trajeto-route-usage-events",
      JSON.stringify({
        "-15.76123, -48.28123::hospital": [new Date().toISOString()],
      })
    );

    const stats = getRouteUsageStats("Minha localização", "Hospital", 30);
    expect(stats.total).toBe(3);
    expect(localStorage.getItem("trajeto-route-usage")).not.toContain("-15.76123");
    expect(localStorage.getItem("trajeto-route-usage-events")).not.toContain("-15.76123");
  });

  it("keeps a real timestamped usage history for route windows", () => {
    rememberTrip("Casa", "Trabalho");
    rememberTrip("Casa", "Trabalho");
    const stats = getRouteUsageStats("Casa", "Trabalho", 30);
    expect(stats.total).toBe(2);
    expect(stats.recordedEvents).toBe(2);
    expect(stats.windowDays).toBe(30);
  });
});
