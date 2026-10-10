import { describe, expect, it } from "vitest";
import { CITY_MAP_CATEGORIES, cityMapAtlasLayer, cityMapLayerUrl, cityMapRelatedServicesUrl, publicServiceMapLayer, isReadyRouteLayer, readCityMapLayer } from "./cityMapLayers";

describe("city map layers shared by the atlas and navigation", () => {
  it("exposes the sourced security and environment layers without changing preset categories", () => {
    expect(CITY_MAP_CATEGORIES.some(item => item.value === "seguranca")).toBe(true);
    expect(CITY_MAP_CATEGORIES.some(item => item.value === "meio-ambiente")).toBe(true);
    expect(CITY_MAP_CATEGORIES.findIndex(item => item.value === "seguranca")).toBeLessThan(CITY_MAP_CATEGORIES.findIndex(item => item.value === "educacao"));
    expect(CITY_MAP_CATEGORIES.findIndex(item => item.value === "meio-ambiente")).toBeLessThan(CITY_MAP_CATEGORIES.findIndex(item => item.value === "combustivel"));
    expect(cityMapAtlasLayer("seguranca")).toBe("seguranca");
    expect(cityMapAtlasLayer("meio-ambiente")).toBe("meio-ambiente");
    expect(cityMapAtlasLayer("centro")).toBe("referencia");
    expect(cityMapAtlasLayer("ruas")).toBe("todos");
    expect(isReadyRouteLayer("saude")).toBe(true);
    expect(isReadyRouteLayer("seguranca")).toBe(false);
    expect(isReadyRouteLayer("meio-ambiente")).toBe(false);
    expect(isReadyRouteLayer("ruas")).toBe(false);
  });

  it("restores only supported layers and ignores untrusted or obsolete values", () => {
    expect(readCityMapLayer("ruas")).toBe("ruas");
    expect(readCityMapLayer("seguranca")).toBe("seguranca");
    expect(readCityMapLayer("meio-ambiente")).toBe("meio-ambiente");
    expect(readCityMapLayer("centro")).toBe("centro");
    expect(readCityMapLayer("foo")).toBe("todos");
    expect(readCityMapLayer(null)).toBe("todos");
  });

  it("creates a Pages-aware deep link without GPS or private state", () => {
    const url = cityMapLayerUrl(" Avenida Brasília ", "ruas");
    const parsed = new URL(url, "https://example.org");
    expect(parsed.pathname).toMatch(/\/mapa$/);
    expect(parsed.searchParams.get("q")).toBe("Avenida Brasília");
    expect(parsed.searchParams.get("camada")).toBe("ruas");
    expect([...parsed.searchParams.keys()].sort()).toEqual(["camada", "q"]);
    expect(cityMapLayerUrl("", "todos")).toMatch(/\/mapa$/);
  });
});

it("links map layers to matching services without copying a private search", () => {
  expect(cityMapRelatedServicesUrl("saude")).toContain("categoria=saude");
  expect(cityMapRelatedServicesUrl("seguranca")).toContain("categoria=seguranca");
  expect(cityMapRelatedServicesUrl("meio-ambiente")).toContain("categoria=ambiente");
  expect(cityMapRelatedServicesUrl("transporte")).toContain("categoria=transito");
  expect(new URL(cityMapRelatedServicesUrl("ruas"), "https://example.org").search).toBe("");
});

it("opens the correct map layer for a service filter without exposing search or GPS", () => {
  for (const [service, map] of [
    ["saude", "saude"],
    ["educacao", "educacao"],
    ["seguranca", "seguranca"],
    ["transito", "transporte"],
    ["ambiente", "meio-ambiente"],
    ["documentos", "todos"],
  ] as const) {
    const url = new URL(cityMapLayerUrl("", publicServiceMapLayer(service)), "https://example.org");
    expect(readCityMapLayer(url.searchParams.get("camada"))).toBe(map);
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("lng")).toBe(false);
  }
});
