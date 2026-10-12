import { BUNDLED_CITY_ATLAS } from "./cityAtlas";
import { createDestinationPointResolver } from "./destinationCoordinates";
import { getLocalRoutePresets, getPlannerStreetReferences, type RouteDestinationCategoryFilter } from "./localRoutePresets";
import { filterLocalRoutePresets } from "./localRouteSearch";
import { mentionsDestinationArea } from "./destinationAreas";
import { filterPreparedDestinations } from "./preparedDestinationRoutes";
import type { OfflineRoute } from "./offlineStore";
import type { PublicTravelMode } from "./publicRouting";

export type PlannerDestinationResource = "all" | "coordinates" | "missing" | "streets" | "prepared";
const resolvePoint = createDestinationPointResolver(BUNDLED_CITY_ATLAS);

/** Lists and their previews share a single query; selecting a mode reuses them. */
export function preparePlannerDestinationResources(query = "", category: RouteDestinationCategoryFilter = "todos", options: {
  area?: string; savedRoutes?: readonly OfflineRoute[]; origin?: string; mode?: PublicTravelMode;
} = {}) {
  const { area = "", savedRoutes = [], origin = "", mode = "driving" } = options;
  const base = getLocalRoutePresets(query, category);
  const all = area ? base.filter(item => mentionsDestinationArea(area, item.label, item.detail, item.destination)) : base;
  // A single traversal computes both availability modes without rescanning the catalog.
  const coordinates: typeof all = [];
  const missing: typeof all = [];
  for (const item of all) {
    (resolvePoint(item.destination) ? coordinates : missing).push(item);
  }
  const results = {
    all,
    coordinates,
    missing,
    streets: filterLocalRoutePresets(getPlannerStreetReferences(), query, category).filter(item =>
      !area || mentionsDestinationArea(area, item.label, item.detail, item.destination)),
    prepared: filterPreparedDestinations(all, savedRoutes, origin, mode),
  };
  return { results, counts: { all: all.length, coordinates: coordinates.length, missing: missing.length, streets: results.streets.length, prepared: results.prepared.length } };
}
