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
      getLocalRoutePresets("2ª Delegacia").some(
        item => item.id === "policia-civil-2"
      )
    ).toBe(true);
    expect(
      getLocalRoutePresets("DEAM").some(
        item => item.id === "deam-depai-dpca"
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

it("keeps commercial destinations in the correct shopping and food filters", () => {
  expect(getLocalRoutePresets("Atacadão Dia a Dia", "compras").some(item => item.id === "atacadao-dia-a-dia")).toBe(true);
  expect(getLocalRoutePresets("Burger King", "alimentacao").some(item => item.id === "burger-king-shopping")).toBe(true);
  expect(getLocalRoutePresets("O Boticário", "compras").some(item => item.id === "o-boticario-shopping")).toBe(true);
  expect(getLocalRoutePresets("Cacau Show", "compras")).toEqual([]);
  expect(getLocalRoutePresets("Cacau Show", "alimentacao").some(item => item.id === "cacau-show-shopping")).toBe(true);
});

it("surfaces additional nearby shopping, food, service, and health destinations", () => {
  expect(getLocalRoutePresets("Spoleto", "alimentacao").some(item => item.id === "spoleto-shopping")).toBe(true);
  expect(getLocalRoutePresets("Riachuelo", "compras").some(item => item.id === "riachuelo-shopping")).toBe(true);
  expect(getLocalRoutePresets("Lotérica", "servicos").some(item => item.id === "loterica-shopping")).toBe(true);
  expect(getLocalRoutePresets("Oftalmed", "saude").some(item => item.id === "oftalmed-shopping")).toBe(true);
  expect(getLocalRoutePresets("Drogaria Exclusiva", "compras").some(item => item.id === "drogaria-exclusiva")).toBe(true);
});

it("offers education destinations in their own filter instead of general services", () => {
  const education = getLocalRoutePresets("", "educacao");
  expect(education.some(item => item.id === "cora-coralina")).toBe(true);
  expect(education.some(item => item.id === "cepi-jk")).toBe(true);
  expect(education.every(item => item.category === "educacao")).toBe(true);
  expect(getLocalRoutePresets("Cora Coralina", "servicos")).toEqual([]);
});

it("offers neighborhood and area references with an explicit approximate-location note", () => {
  expect(getLocalRoutePresets("Parque da Barragem", "centro").some(item => item.id === "parque-da-barragem")).toBe(true);
  expect(getLocalRoutePresets("Jardim Brasília", "centro").some(item => item.id === "jardim-brasilia")).toBe(true);
  expect(getLocalRoutePresets("Mansões Centro-Oeste", "centro").some(item => item.id === "mansoes-centro-oeste")).toBe(true);
  expect(getLocalRoutePresets("Mansões Centro-Oeste", "saude").some(item => item.id === "oftalmed-shopping")).toBe(true);
  expect(LOCAL_ROUTE_PRESETS.filter(item => item.id === "parque-da-barragem")[0]?.detail).toMatch(/aproximado/i);
});


it("resolves only explicit mapped references and preserves ambiguous bare streets", async () => {
  const { READY_ROUTE_STREET_POINTS, resolveReadyRouteStreetPoint } = await import("./localRoutePresets");
  const jk = READY_ROUTE_STREET_POINTS.find(point => point.label === "Avenida JK")!;
  expect(resolveReadyRouteStreetPoint(jk.destination)).toEqual({ lat: jk.lat, lng: jk.lng });
  expect(resolveReadyRouteStreetPoint("Avenida JK")).toBeNull();
  expect(resolveReadyRouteStreetPoint("Avenida JK, casa 123")).toBeNull();
});
