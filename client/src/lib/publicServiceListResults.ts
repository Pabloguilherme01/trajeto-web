import { publicServiceContacts } from "./contactActions";
import { searchPublicServices, type PublicService, type PublicServiceCategory } from "./publicServices";
import type { PublicServiceResourceFilter } from "./publicServiceListFilters";

// Official catalog entries do not mutate in place. Reuse the expensive phone /
// WhatsApp parsing when changing only category, search term or favorite status.
const hasContact = new WeakMap<PublicService, boolean>();

function supportsContact(service: PublicService) {
  const cached = hasContact.get(service);
  if (cached !== undefined) return cached;
  const present = publicServiceContacts(service).length > 0;
  hasContact.set(service, present);
  return present;
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
      (resource === "contato" && supportsContact(service)) ||
      (resource === "rota" && Boolean(service.mapQuery)) ||
      (resource === "online" && Boolean(service.actionUrl))
    )) continue;
    // Stable partition, replacing repeated O(n log n) sorting while
    // preserving catalog order within favorites and other services.
    (isFavorite ? favorites : remaining).push(service);
  }
  return favorites.concat(remaining);
}
