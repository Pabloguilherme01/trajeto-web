import { describe, expect, it } from "vitest";
import { getDepartureSignals, isDfCorridorTrip } from "./departureAssistant";

describe("departure assistant", () => {
  it("detects common DF corridor destinations without accents", () => {
    expect(isDfCorridorTrip("Águas Lindas de Goiás", "Taguatinga, Brasília - DF")).toBe(true);
    expect(isDfCorridorTrip("", "Ceilandia")).toBe(true);
    expect(isDfCorridorTrip("", "BR-070")).toBe(true);
    expect(isDfCorridorTrip("", "Jardim Brasília, Águas Lindas de Goiás")).toBe(false);
  });

  it("adds road, connectivity, weather and transit context for a DF driving trip", () => {
    const ids = getDepartureSignals({
      origin: "Águas Lindas de Goiás",
      destination: "Taguatinga, Brasília - DF",
      mode: "driving",
      online: true,
      hasOfflineRoute: false,
    }).map(item => item.id);

    expect(ids).toContain("weather-check");
    expect(ids).toContain("road-context");
    expect(ids).toContain("connectivity-prepare");
    expect(ids).toContain("df-transit");
  });

  it("does not claim connectivity risk when a route is already prepared offline", () => {
    const ids = getDepartureSignals({
      destination: "Brasília",
      mode: "driving",
      online: true,
      hasOfflineRoute: true,
    }).map(item => item.id);
    expect(ids).not.toContain("connectivity-prepare");
  });

  it("keeps local trips simple", () => {
    const signals = getDepartureSignals({
      destination: "UPA Mansões Odisseia, Águas Lindas de Goiás",
      mode: "driving",
      online: true,
    });
    expect(signals.map(item => item.id)).toEqual(["weather-check"]);
  });

  it("prioritizes local offline guidance without pretending to refresh sources", () => {
    const signals = getDepartureSignals({
      destination: "Taguatinga",
      mode: "transit",
      online: false,
    });
    expect(signals[0].id).toBe("offline-now");
    expect(signals.some(item => item.id === "weather-check")).toBe(false);
    expect(signals.some(item => item.id === "df-transit")).toBe(true);
  });
});
