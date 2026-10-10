import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import type { PublicService } from "./publicServices";

type SearchableRoute = { label: string; detail: string; destination: string };
type RouteIndex = ReturnType<typeof createCatalogSearchIndex>;

// A prepared route and its associated official service are stable objects.
// Text is indexed lazily and reused across keystrokes; a new source snapshot
// gets fresh objects and therefore fresh indexes without a global unbounded map.
const indexes = new WeakMap<SearchableRoute, {
  routeOnly?: RouteIndex;
  withService: WeakMap<PublicService, RouteIndex>;
}>();

function indexedRoute(route: SearchableRoute, service?: PublicService): RouteIndex {
  let record = indexes.get(route);
  if (!record) {
    record = { withService: new WeakMap() };
    indexes.set(route, record);
  }
  const cached = service ? record.withService.get(service) : record.routeOnly;
  if (cached) return cached;
  const index = createCatalogSearchIndex([
    route.label,
    route.detail,
    route.destination,
    service?.name,
    service?.description,
    ...(service?.keywords ?? []),
  ]);
  if (service) record.withService.set(service, index);
  else record.routeOnly = index;
  return index;
}

function searchTerms(query: string) {
  return normalizeCatalogText(query).replace(/[ºª]/g, "").split(" ").filter(Boolean);
}

/** Match route, description and official-service needs using the existing token rules. */
export function matchesPublicServiceRoute(
  query: string,
  route: SearchableRoute,
  service?: PublicService,
) {
  const terms = searchTerms(query);
  return !terms.length || matchesCatalogTerms(terms, indexedRoute(route, service));
}

/** Normalize once per query, not once per row; keep original catalogue order. */
export function filterPublicServiceRoutes<T extends SearchableRoute & { id: string }>(
  routes: readonly T[],
  query: string,
  servicesByRouteId: ReadonlyMap<string, PublicService>,
): T[] {
  const terms = searchTerms(query);
  if (!terms.length) return routes.slice();
  return routes.filter(route =>
    matchesCatalogTerms(terms, indexedRoute(route, servicesByRouteId.get(route.id)))
  );
}
