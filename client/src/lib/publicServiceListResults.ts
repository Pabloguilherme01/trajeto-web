import { publicServiceHasContacts } from "./publicServiceContactCache";
import { searchPublicServices, type PublicService, type PublicServiceCategory } from "./publicServices";
import type { PublicServiceResourceFilter } from "./publicServiceListFilters";

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
