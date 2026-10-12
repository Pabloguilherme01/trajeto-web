import { describe, expect, it } from "vitest";
import { CITY_MAP_CATEGORIES, cityMapAtlasLayer, cityMapLayerUrl, cityMapRelatedServicesUrl, publicServiceMapLayer, cityMapNeedsAnp, cityMapNeedsBusinessCatalog, isReadyRouteLayer, readCityMapLayer, readCityMapCoordinateMode } from "./cityMapLayers";

describe("city map layers shared by the atlas and navigation", () => {
  it("shares identity-only and CNPJ registry filters while preserving public refinements", () => {
    const url = new URL(cityMapLayerUrl("Loja", "compras", "all", "bairro-jardim-brasilia", "unnamed"), "https://example.test");
    expect(url.searchParams.get("empresas")).toBe("sem-nome");
    expect(url.searchParams.get("q")).toBe("Loja");
    expect(url.searchParams.get("camada")).toBe("compras");
    expect(url.searchParams.get("bairro")).toBe("bairro-jardim-brasilia");
    expect(cityMapLayerUrl("", "todos", "all", "", "named")).toContain("empresas=nome");
    expect(cityMapLayerUrl("", "todos", "all", "", "cnpj")).toContain("empresas=cnpj");
  });
  it("retains valid municipal bairro filters in shareable URLs but ignores unknown IDs", () => {
    const url = new URL(cityMapLayerUrl("CRAS", "servicos", "coordinates", "bairro-jardim-brasilia"), "https://example.org");
    expect(url.searchParams.get("bairro")).toBe("bairro-jardim-brasilia");
    expect(url.searchParams.get("coordenadas")).toBe("1");
    expect(url.searchParams.get("q")).toBe("CRAS");
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("lng")).toBe(false);
    expect(cityMapLayerUrl("CRAS", "servicos", "all", "user-gps")).not.toContain("bairro=");
  });
  it("shares public missing-coordinate refinement without leaking GPS and ignores unknown values", () => {
    expect(readCityMapCoordinateMode(null)).toBe("all");
    expect(readCityMapCoordinateMode("1")).toBe("coordinates");
    expect(readCityMapCoordinateMode("0")).toBe("missing");
    expect(readCityMapCoordinateMode("-1")).toBe("all");
    const url = cityMapLayerUrl("CRAS", "servicos", "missing");
    expect(url).toContain("coordenadas=0");
    expect(url).toContain("camada=servicos");
    expect(url).toContain("q=CRAS");
    expect(url).not.toMatch(/lat=|lng=|origem=/);
    expect(cityMapLayerUrl("CRAS", "servicos", "all")).not.toContain("coordenadas");
    expect(cityMapLayerUrl("CRAS", "servicos", true)).toContain("coordenadas=1");
  });
  it("keeps coordinate availability as a shareable public filter without adding GPS", () => {
    const filtered = cityMapLayerUrl("CRAS", "servicos", true);
    expect(filtered).toContain("coordenadas=1");
    expect(filtered).toContain("q=CRAS");
    expect(filtered).toContain("camada=servicos");
    expect(cityMapLayerUrl("CRAS", "servicos", false)).not.toContain("coordenadas");
  });
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
    expect(readCityMapLayer("bairros")).toBe("bairros");
    expect(cityMapLayerUrl("jardim brasilia", "bairros")).toContain("camada=bairros");
    expect(cityMapAtlasLayer("bairros")).toBe("todos");
    expect(isReadyRouteLayer("bairros")).toBe(false);
    expect(cityMapNeedsAnp("bairros")).toBe(false);
    expect(cityMapNeedsBusinessCatalog("bairros")).toBe(false);
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

it("does not require ANP catalog for streets, safety, environment or public services", () => {
  expect(cityMapNeedsAnp("todos")).toBe(true);
  expect(cityMapNeedsAnp("combustivel")).toBe(true);
  for (const layer of ["ruas", "seguranca", "meio-ambiente", "saude", "educacao", "transporte", "compras"] as const) {
    expect(cityMapNeedsAnp(layer)).toBe(false);
  }
});

it("loads companies only in layers backed by the imported business categories", () => {
  for (const layer of ["ruas", "seguranca", "centro", "combustivel"] as const)
    expect(cityMapNeedsBusinessCatalog(layer)).toBe(false);
  for (const layer of ["todos", "saude", "educacao", "servicos", "compras", "transporte", "alimentacao", "meio-ambiente"] as const)
    expect(cityMapNeedsBusinessCatalog(layer)).toBe(true);
});
