import { BUNDLED_CITY_ATLAS } from "./cityAtlas";
import { createDestinationPointResolver } from "./destinationCoordinates";
import { getLocalRoutePresets, getPlannerStreetReferences, type RouteDestinationCategoryFilter } from "./localRoutePresets";
import { filterLocalRoutePresets } from "./localRouteSearch";

export type PlannerDestinationResource = "all" | "coordinates" | "missing" | "streets";
const resolvePoint = createDestinationPointResolver(BUNDLED_CITY_ATLAS);

/** Lists and their previews share a single query; selecting a mode reuses them. */
export function preparePlannerDestinationResources(query = "", category: RouteDestinationCategoryFilter = "todos") {
  const all = getLocalRoutePresets(query, category);
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
    streets: filterLocalRoutePresets(getPlannerStreetReferences(), query, category),
  };
  return { results, counts: { all: all.length, coordinates: coordinates.length, missing: missing.length, streets: results.streets.length } };
}
