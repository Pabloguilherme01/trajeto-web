import { describe, expect, it } from "vitest";
import { directionsWaypoint, realDetourKm } from "./routeDetour";

describe("route detour", () => {
  it("calcula somente a distância adicional da rota com parada", () => {
    expect(realDetourKm(25_000, 28_450)).toBe(3.5);
    expect(realDetourKm(25_000, 24_900)).toBe(0);
  });

  it("mantém a parada como coordenada explícita para Directions", () => {
    expect(directionsWaypoint({ lat: -15.8123, lng: -48.1024 })).toBe("-15.8123,-48.1024");
  });
});
