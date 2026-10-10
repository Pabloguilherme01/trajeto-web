import { appUrl } from "./appUrl";
import type { CityAtlasLayer } from "./cityAtlas";
import { ROUTE_DESTINATION_CATEGORIES, type RouteDestinationCategoryFilter } from "./localRoutePresets";

/** The atlas has additional layers that the ready-route presets do not. */
export type CityMapCategory = RouteDestinationCategoryFilter | "seguranca" | "meio-ambiente";
export type CityMapLayer = CityMapCategory | "ruas";

export const CITY_MAP_CATEGORIES: ReadonlyArray<{ value: CityMapCategory; label: string }> = [
  ...ROUTE_DESTINATION_CATEGORIES,
  { value: "seguranca", label: "Segurança" },
  { value: "meio-ambiente", label: "Meio ambiente" },
];

const allowedLayers = new Set<CityMapLayer>([
  ...CITY_MAP_CATEGORIES.map(item => item.value),
  "ruas",
]);

/** Only known public map layers may be supplied by URLs. */
export function readCityMapLayer(value: string | null): CityMapLayer {
  return value && allowedLayers.has(value as CityMapLayer) ? value as CityMapLayer : "todos";
}

export function cityMapAtlasLayer(layer: CityMapLayer): "todos" | CityAtlasLayer {
  if (layer === "ruas" || layer === "todos") return "todos";
  if (layer === "centro") return "referencia";
  return layer;
}

export function isReadyRouteLayer(layer: CityMapLayer): layer is RouteDestinationCategoryFilter {
  return layer !== "ruas" && layer !== "seguranca" && layer !== "meio-ambiente";
}

/** Shareable, Pages-aware filtered map URL. Never accepts or emits personal GPS. */
export function cityMapLayerUrl(query: string, layer: CityMapLayer): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (layer !== "todos") params.set("camada", layer);
  const suffix = params.toString();
  return appUrl("/mapa") + (suffix ? "?" + suffix : "");
}
