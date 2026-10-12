import { publicServiceHasContacts } from "./publicServiceContactCache";
import { searchPublicServices, type PublicService, type PublicServiceCategory } from "./publicServices";
import type { PublicServiceResourceFilter } from "./publicServiceListFilters";

export type PublicServiceResourceCounts = Record<PublicServiceResourceFilter, number>;

function hasResource(service: PublicService, resource: PublicServiceResourceFilter): boolean {
  return resource === "todos" ||
    (resource === "contato" && publicServiceHasContacts(service)) ||
    (resource === "rota" && Boolean(service.mapQuery)) ||
    (resource === "online" && Boolean(service.actionUrl));
}

/** Preview the same search/category/favorite scope before selecting a mode. */
export function countPublicServiceResources(
  services: readonly PublicService[],
  savedOnly: boolean,
  favoriteIds: ReadonlySet<string>,
): PublicServiceResourceCounts {
  const counts = { todos: 0, contato: 0, rota: 0, online: 0 };
  for (const service of services) {
    if (savedOnly && !favoriteIds.has(service.id)) continue;
    counts.todos++;
    if (hasResource(service, "contato")) counts.contato++;
    if (hasResource(service, "rota")) counts.rota++;
    if (hasResource(service, "online")) counts.online++;
  }
  return counts;
}

/** Refine prepared search results without searching or copying the catalog again. */
export function filterPublicServiceCandidates(
  services: readonly PublicService[],
  resource: PublicServiceResourceFilter,
  savedOnly: boolean,
  favoriteIds: ReadonlySet<string>,
): PublicService[] {
  const favorites: PublicService[] = [];
  const remaining: PublicService[] = [];
  for (const service of services) {
    const isFavorite = favoriteIds.has(service.id);
    if (savedOnly && !isFavorite) continue;
    if (!hasResource(service, resource)) continue;
    // Stable partition preserves catalog order inside both groups.
    (isFavorite ? favorites : remaining).push(service);
  }
  return favorites.concat(remaining);
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

  return filterPublicServiceCandidates(searchPublicServices(query, category), resource, savedOnly, favoriteIds);
}
