import { LOCAL_READY_ROUTES, type RouteDestinationCategoryFilter } from "./localRoutePresets";
import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";

const indexes = new WeakMap<(typeof LOCAL_READY_ROUTES)[number], ReturnType<typeof createCatalogSearchIndex>>();

export function filterReadyRoutes(query: string, category: RouteDestinationCategoryFilter, originId: string) {
  const terms = normalizeCatalogText(query).replace(/[ºª]/g, "").split(" ").filter(Boolean);
  return LOCAL_READY_ROUTES.filter(route => {
    if (originId !== "todos" && originId !== route.originId) return false;
    if (category !== "todos" && category !== route.category) return false;
    if (!terms.length) return true;
    let index = indexes.get(route);
    if (!index) {
      index = createCatalogSearchIndex([route.label, route.origin, route.destination, route.detail]);
      indexes.set(route, index);
    }
    return matchesCatalogTerms(terms, index);
  });
}
