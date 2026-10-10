import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import type { LocalRoutePreset, RouteDestinationCategoryFilter } from "./localRoutePresets";

// Destination records are immutable after the catalog is assembled. Cache each
// normalized text once, only when someone actually searches for a place.
const searchIndex = new WeakMap<LocalRoutePreset, ReturnType<typeof createCatalogSearchIndex>>();

function indexedRoute(route: LocalRoutePreset) {
  let index = searchIndex.get(route);
  if (!index) {
    index = createCatalogSearchIndex([route.label, route.detail, route.destination, route.category]);
    searchIndex.set(route, index);
  }
  return index;
}

/** Retain the original order and exact token/substring matching semantics. */
export function filterLocalRoutePresets(
  items: readonly LocalRoutePreset[],
  query = "",
  category: RouteDestinationCategoryFilter = "todos",
): LocalRoutePreset[] {
  const terms = normalizeCatalogText(query).replace(/[ºª]/g, "").split(" ").filter(Boolean);
  return items.filter(route =>
    (category === "todos" || route.category === category) &&
    (!terms.length || matchesCatalogTerms(terms, indexedRoute(route)))
  );
}
