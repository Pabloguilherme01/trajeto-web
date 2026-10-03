import { describe, expect, it } from "vitest";
import {
  ALL_LOCAL_ROUTE_DESTINATIONS,
  getLocalRoutePresets,
  LOCAL_ROUTE_PRESETS,
} from "./localRoutePresets";

describe("local route presets", () => {
  it("does not offer an unverified local Saneago destination in the planner", () => {
    expect(getLocalRoutePresets("Saneago")).toEqual([]);
    expect(
      ALL_LOCAL_ROUTE_DESTINATIONS.some(item => item.id === "saneago")
    ).toBe(false);
  });
  it("provides a broad set of reusable city destinations", () => {
    expect(LOCAL_ROUTE_PRESETS.length).toBeGreaterThanOrEqual(20);
    expect(ALL_LOCAL_ROUTE_DESTINATIONS.length).toBeGreaterThanOrEqual(80);
    expect(
      getLocalRoutePresets("Cadastro Único").some(
        item => item.id === "cadunico"
      )
    ).toBe(true);
    expect(
      getLocalRoutePresets("CRAS II Santa Lucia").some(
        item => item.id === "cras-2"
      )
    ).toBe(true);
    expect(
      new Set(ALL_LOCAL_ROUTE_DESTINATIONS.map(item => item.id)).size
    ).toBe(ALL_LOCAL_ROUTE_DESTINATIONS.length);
    const normalizedDestinations = ALL_LOCAL_ROUTE_DESTINATIONS.map(item =>
      item.destination
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .replace(/\b(goias|go)\b/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    ).filter(Boolean);
    expect(new Set(normalizedDestinations).size).toBe(normalizedDestinations.length);
    expect(
      getLocalRoutePresets("Giraffas").some(
        item => item.id === "place-giraffas-shopping"
      )
    ).toBe(true);
    expect(getLocalRoutePresets("HEAL").some(item => item.id === "heal")).toBe(
      true
    );
    expect(
      getLocalRoutePresets("delegacia").some(
        item => item.id === "policia-civil"
      )
    ).toBe(true);
    expect(
      getLocalRoutePresets("UBS").some(item => item.id === "ubs-barragem-ii")
    ).toBe(true);
    expect(getLocalRoutePresets("odisseia", "saude").some(item => item.id === "upa")).toBe(true);
    expect(getLocalRoutePresets("odisseia", "compras").some(item => item.id === "upa")).toBe(false);
  });
});

it("keeps hospital shortcuts consistent with the service attendance warning", () => {
  const hospital = LOCAL_ROUTE_PRESETS.find(item => item.id === "hospital-bom-jesus");
  expect(hospital?.detail).not.toMatch(/24h/i);
  expect(hospital?.detail).toMatch(/confirm/i);
  expect(getLocalRoutePresets("Hospital Bom Jesus").some(item => item.id === hospital?.id)).toBe(true);
});

it("offers education destinations in their own filter instead of general services", () => {
  const education = getLocalRoutePresets("", "educacao");
  expect(education.some(item => item.id === "cora-coralina")).toBe(true);
  expect(education.some(item => item.id === "cepi-jk")).toBe(true);
  expect(education.every(item => item.category === "educacao")).toBe(true);
  expect(getLocalRoutePresets("Cora Coralina", "servicos")).toEqual([]);
});
