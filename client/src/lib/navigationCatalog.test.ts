import { describe, expect, it } from "vitest";
import { NAVIGATION_DESTINATIONS, searchNavigationDestinations, stationNavigationDestination } from "./navigationCatalog";

describe("navigationCatalog", () => {
  it("keeps destination identities unique across integrated sources", () => {
    const keys = NAVIGATION_DESTINATIONS.map(item => item.destination.toLocaleLowerCase("pt-BR").trim());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("searches the same integrated destinations used by the planner", () => {
    const results = searchNavigationDestinations("hospital", 20);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(item => NAVIGATION_DESTINATIONS.some(candidate => candidate.id === item.id))).toBe(true);
  });

  it("prefers coordinates for a station route when they are available", () => {
    const item = stationNavigationDestination({
      id: "posto-1",
      name: "Posto Teste",
      address: "BR-070",
      lat: -15.75,
      lng: -48.28,
      cnpj: "00.000.000/0001-00",
    });
    expect(item.destination).toBe("-15.75,-48.28");
    expect(item.id).toBe("station:00.000.000/0001-00");
  });

  it("falls back to a readable station destination without coordinates", () => {
    const item = stationNavigationDestination({
      name: "Posto Teste",
      address: "BR-070, Águas Lindas de Goiás",
    });
    expect(item.destination).toContain("Posto Teste");
    expect(item.destination).toContain("BR-070");
  });
});
