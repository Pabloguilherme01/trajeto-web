import { BUNDLED_CITY_ATLAS } from "./cityAtlas";
import { createDestinationPointResolver } from "./destinationCoordinates";
import { getLocalRoutePresets, getPlannerStreetReferences, type RouteDestinationCategoryFilter } from "./localRoutePresets";
import { filterLocalRoutePresets } from "./localRouteSearch";

export type PlannerDestinationResource = "all" | "coordinates" | "streets";
const resolvePoint = createDestinationPointResolver(BUNDLED_CITY_ATLAS);

/** Lists and their previews share a single query; selecting a mode reuses them. */
export function preparePlannerDestinationResources(query = "", category: RouteDestinationCategoryFilter = "todos") {
  const all = getLocalRoutePresets(query, category);
  const results = {
    all,
    coordinates: all.filter(item => Boolean(resolvePoint(item.destination))),
    streets: filterLocalRoutePresets(getPlannerStreetReferences(), query, category),
  };
  return { results, counts: { all: all.length, coordinates: results.coordinates.length, streets: results.streets.length } };
}
