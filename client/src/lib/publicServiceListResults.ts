import { publicServiceHasContacts } from "./publicServiceContactCache";
import { searchPublicServices, type PublicService, type PublicServiceCategory } from "./publicServices";
import type { PublicServiceResourceFilter } from "./publicServiceListFilters";

export type PublicServiceResourceCounts = Record<PublicServiceResourceFilter, number>;

/** Prepare mode results together; switching modes reuses these ordered lists. */
export function preparePublicServiceResourceModes(services: readonly PublicService[]) {
  const results: Record<PublicServiceResourceFilter, PublicService[]> = {
    todos: services.slice(), contato: [], rota: [], online: [],
  };
  // The input already includes text, category, favorites and their ordering.
  // No second search, text index, sorting or contact parsing is needed.
  for (const service of services) {
    if (publicServiceHasContacts(service)) results.contato.push(service);
    if (service.mapQuery) results.rota.push(service);
    if (service.actionUrl) results.online.push(service);
  }
  const counts: PublicServiceResourceCounts = {
    todos: results.todos.length, contato: results.contato.length,
    rota: results.rota.length, online: results.online.length,
  };
  return { results, counts };
}

export function filterPublicServiceResults({
  query,
  category,
  resource,
  savedOnly,
  favoriteIds,
  selectedService,
}: {
  query: string;
  category: PublicServiceCategory | "todos";
  resource: PublicServiceResourceFilter;
  savedOnly: boolean;
  favoriteIds: ReadonlySet<string>;
  selectedService?: PublicService;
}): PublicService[] {
  // A valid deep link always opens its record regardless of directory filters.
  if (selectedService) return [selectedService];

  const favorites: PublicService[] = [];
  const remaining: PublicService[] = [];
  for (const service of searchPublicServices(query, category)) {
    const isFavorite = favoriteIds.has(service.id);
    if (savedOnly && !isFavorite) continue;
    if (resource !== "todos" && !(
      (resource === "contato" && publicServiceHasContacts(service)) ||
      (resource === "rota" && Boolean(service.mapQuery)) ||
      (resource === "online" && Boolean(service.actionUrl))
    )) continue;
    // Stable partition, replacing repeated O(n log n) sorting while
    // preserving catalog order within favorites and other services.
    (isFavorite ? favorites : remaining).push(service);
  }
  return favorites.concat(remaining);
}
