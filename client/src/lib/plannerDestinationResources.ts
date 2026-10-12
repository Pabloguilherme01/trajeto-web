import { BUNDLED_CITY_ATLAS } from "./cityAtlas";
import { createDestinationPointResolver } from "./destinationCoordinates";
import { getLocalRoutePresets, getPlannerAreaReferences, getPlannerStreetReferences, type RouteDestinationCategoryFilter } from "./localRoutePresets";
import { filterLocalRoutePresets } from "./localRouteSearch";
import { mentionsDestinationArea } from "./destinationAreas";
import { filterPreparedDestinations } from "./preparedDestinationRoutes";
import type { OfflineRoute } from "./offlineStore";
import type { PublicTravelMode } from "./publicRouting";

export type PlannerDestinationResource = "all" | "coordinates" | "missing" | "streets" | "areas" | "prepared";
const resolvePoint = createDestinationPointResolver(BUNDLED_CITY_ATLAS);

function prepareCatalog(query: string, category: RouteDestinationCategoryFilter, area: string) {
  const base = getLocalRoutePresets(query, category);
  const all = area ? base.filter(item => mentionsDestinationArea(area, item.label, item.detail, item.destination)) : base;
  // A single traversal computes both availability modes without rescanning the catalog.
  const coordinates: typeof all = [];
  const missing: typeof all = [];
  for (const item of all) {
    (resolvePoint(item.destination) ? coordinates : missing).push(item);
  }
  return {
    all,
    coordinates,
    missing,
    streets: filterLocalRoutePresets(getPlannerStreetReferences(), query, category).filter(item =>
      !area || mentionsDestinationArea(area, item.label, item.detail, item.destination)),
    areas: filterLocalRoutePresets(getPlannerAreaReferences(), query, category).filter(item =>
      !area || mentionsDestinationArea(area, item.label, item.destination)),
  };
}

// One bounded entry for versioned public lists. Trip data is never retained here.
let lastCatalog: { key: string; results: ReturnType<typeof prepareCatalog> } | undefined;

/** Changing origin/mode only updates routes actually prepared on this device. */
export function preparePlannerDestinationResources(query = "", category: RouteDestinationCategoryFilter = "todos", options: {
  area?: string; savedRoutes?: readonly OfflineRoute[]; origin?: string; mode?: PublicTravelMode;
} = {}) {
  const { area = "", savedRoutes = [], origin = "", mode = "driving" } = options;
  const key = JSON.stringify([query, category, area]);
  if (lastCatalog?.key !== key) lastCatalog = { key, results: prepareCatalog(query, category, area) };
  const catalog = lastCatalog.results;
  const results = { ...catalog, prepared: filterPreparedDestinations(catalog.all, savedRoutes, origin, mode) };
  const { all, coordinates, missing } = results;
  return { results, counts: { all: all.length, coordinates: coordinates.length, missing: missing.length, streets: results.streets.length, areas: results.areas.length, prepared: results.prepared.length } };
}
