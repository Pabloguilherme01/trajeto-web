import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import type { PublicService, PublicServiceCategory } from "./publicServices";

// The bundled catalog is immutable. Keep the search implementation separate
// from official service records, and do not build text indexes on module import.
type SearchIndex = ReturnType<typeof createCatalogSearchIndex>;
type ServiceSearchEntry = {
  service: PublicService;
  concise: SearchIndex;
  complete: SearchIndex;
  withCategory: SearchIndex;
};
const indexes = new WeakMap<readonly PublicService[], ServiceSearchEntry[]>();
const LINKING_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "para"]);

function indexedServices(items: readonly PublicService[]): ServiceSearchEntry[] {
  let indexed = indexes.get(items);
  if (!indexed) {
    indexed = items.map(service => {
      const concise = [service.name, service.category, service.actionLabel, ...(service.keywords ?? [])];
      const complete = [
        service.name, service.description, service.address, service.phone,
        service.extraPhone, service.guidance, service.actionLabel, service.hours,
        ...(service.keywords ?? []),
      ];
      return {
        service,
        concise: createCatalogSearchIndex(concise),
        complete: createCatalogSearchIndex(complete),
        withCategory: createCatalogSearchIndex([...complete, service.category]),
      };
    });
    indexes.set(items, indexed);
  }
  return indexed;
}

/**
 * Category browsing needs no normalized text index. Build one only on the
 * first actual text search and reuse it for subsequent keystrokes, preserving
 * the original catalog order, search scopes, and acronym rules.
 */
export function searchPublicServicesIn(
  items: readonly PublicService[],
  query = "",
  category: PublicServiceCategory | "todos" = "todos",
): PublicService[] {
  const search = normalizeCatalogText(query)
    .split(" ")
    .filter(term => !LINKING_WORDS.has(term))
    .join(" ");

  if (!search) {
    // Return independent arrays just as the original filter/map did.
    return items.filter(service => category === "todos" || service.category === category);
  }

  const terms = search.replace(/[ºª]/g, "").split(" ").filter(Boolean);
  const conciseIntent = /^[a-z0-9]{2,4}$/.test(search);
  const includeCategoryIntent = terms.length <= 2;
  return indexedServices(items).filter(entry => {
    const { service } = entry;
    if (category !== "todos" && service.category !== category) return false;
    if (search === "cras" && !service.id.startsWith("cras-")) return false;
    if (search === "cpf" && service.id !== "receita-federal-pav") return false;
    return matchesCatalogTerms(terms, conciseIntent ? entry.concise : includeCategoryIntent ? entry.withCategory : entry.complete);
  }).map(entry => entry.service);
}
