import { appUrl } from "./appUrl";
import { readDestinationArea } from "./destinationAreas";
import type { BusinessCatalogMode } from "./businessCatalogState";
import type { CityAtlasLayer } from "./cityAtlas";
import type { PublicServiceCategory } from "./publicServices";
import { ROUTE_DESTINATION_CATEGORIES, type RouteDestinationCategoryFilter } from "./routeDestinationCategories";

/** The atlas has additional layers that the ready-route presets do not. */
export type CityMapCategory = RouteDestinationCategoryFilter | "seguranca" | "meio-ambiente";
export type CityMapLayer = CityMapCategory | "ruas" | "bairros";

export const CITY_MAP_CATEGORIES: ReadonlyArray<{ value: CityMapCategory; label: string }> =
  ROUTE_DESTINATION_CATEGORIES.flatMap<{ value: CityMapCategory; label: string }>(item =>
    item.value === "saude"
      ? [item, { value: "seguranca" as const, label: "Segurança" }]
      : item.value === "transporte"
        ? [item, { value: "meio-ambiente" as const, label: "Meio ambiente" }]
        : [item]
  );

const allowedLayers = new Set<CityMapLayer>([
  ...CITY_MAP_CATEGORIES.map(item => item.value),
  "ruas", "bairros",
]);

/** Only known public map layers may be supplied by URLs. */
export function readCityMapLayer(value: string | null): CityMapLayer {
  return value && allowedLayers.has(value as CityMapLayer) ? value as CityMapLayer : "todos";
}

export function cityMapAtlasLayer(layer: CityMapLayer): "todos" | CityAtlasLayer {
  if (layer === "ruas" || layer === "bairros" || layer === "todos") return "todos";
  if (layer === "centro") return "referencia";
  return layer;
}

export function isReadyRouteLayer(layer: CityMapLayer): layer is RouteDestinationCategoryFilter {
  return layer !== "ruas" && layer !== "bairros" && layer !== "seguranca" && layer !== "meio-ambiente";
}

export type CityMapCoordinateMode = "all" | "coordinates" | "missing";

/** Interpret only known public catalog refinements; never treat GPS as a URL filter. */
export function readCityMapCoordinateMode(value: string | null): CityMapCoordinateMode {
  return value === "1" ? "coordinates" : value === "0" ? "missing" : "all";
}

/** Shareable, Pages-aware filtered map URL. Never accepts or emits personal GPS. */
export function cityMapLayerUrl(query: string, layer: CityMapLayer, coordinatesOnly: boolean | CityMapCoordinateMode = false, area = "", businesses: BusinessCatalogMode = "all"): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (layer !== "todos") params.set("camada", layer);
  if (coordinatesOnly === true || coordinatesOnly === "coordinates") params.set("coordenadas", "1");
  if (coordinatesOnly === "missing") params.set("coordenadas", "0");
  const validArea = readDestinationArea(area);
  if (validArea) params.set("bairro", validArea);
  if (businesses !== "all") params.set("empresas", businesses === "named" ? "nome" : businesses === "unnamed" ? "sem-nome" : "cnpj");
  const suffix = params.toString();
  return appUrl("/mapa") + (suffix ? "?" + suffix : "");
}


/** Link atlas categories to the corresponding official service directory. */
export function cityMapRelatedServicesUrl(layer: CityMapLayer): string {
  const category = layer === "saude" || layer === "educacao" || layer === "seguranca"
    ? layer
    : layer === "meio-ambiente"
      ? "ambiente"
      : layer === "transporte"
        ? "transito"
        : null;
  return appUrl("/servicos") + (category ? "?categoria=" + encodeURIComponent(category) : "");
}


/**
 * Reverse navigation from the official service directory to the matching
 * map layer. Unknown or administrative-only categories show the full map
 * rather than inventing a geographic layer.
 */
export function publicServiceMapLayer(category: PublicServiceCategory | "todos"): CityMapCategory {
  if (category === "seguranca") return "seguranca";
  if (category === "ambiente") return "meio-ambiente";
  if (category === "transito") return "transporte";
  if (category === "saude" || category === "educacao") return category;
  return "todos";
}


/** Only the complete map and fuel layer need the ANP station directory. */
export function cityMapNeedsAnp(layer: CityMapLayer): boolean {
  return layer === "todos" || layer === "combustivel";
}


/**
 * Imported companies exist only in these atlas categories. Security, fuel,
 * city references and street-only views are served from official/local
 * datasets, so they should never download the 21k-record business catalog.
 */
export function cityMapNeedsBusinessCatalog(layer: CityMapLayer): boolean {
  return layer !== "ruas" && layer !== "bairros" && layer !== "seguranca" &&
    layer !== "combustivel" && layer !== "centro";
}
