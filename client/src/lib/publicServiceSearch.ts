import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import type { PublicService, PublicServiceCategory } from "./publicServices";

// The bundled catalog is immutable. Keep the search implementation separate
// from official service records, and do not build text indexes on module import.
type SearchIndex = ReturnType<typeof createCatalogSearchIndex>;
type SearchScope = "concise" | "complete" | "withCategory";
type ServiceSearchEntry = { service: PublicService; index: SearchIndex };
// Keep only the scopes that were actually requested. A short acronym needs
// names/keywords, not three normalized copies of every public service record.
const indexes = new WeakMap<readonly PublicService[], Map<SearchScope, ServiceSearchEntry[]>>();
const LINKING_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "para"]);

function indexedServices(items: readonly PublicService[], scope: SearchScope): ServiceSearchEntry[] {
  let byScope = indexes.get(items);
  if (!byScope) {
    byScope = new Map();
    indexes.set(items, byScope);
  }
  let indexed = byScope.get(scope);
  if (!indexed) {
    indexed = items.map(service => {
      const values = scope === "concise"
        ? [service.name, service.category, service.actionLabel, ...(service.keywords ?? [])]
        : [
          service.name, service.description, service.address, service.phone,
          service.extraPhone, service.guidance, service.actionLabel, service.hours,
          ...(service.keywords ?? []),
          ...(scope === "withCategory" ? [service.category] : []),
        ];
      return { service, index: createCatalogSearchIndex(values) };
    });
    byScope.set(scope, indexed);
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
  const scope: SearchScope = conciseIntent ? "concise"
    : includeCategoryIntent ? "withCategory" : "complete";
  return indexedServices(items, scope).filter(({ service, index }) => {
    if (category !== "todos" && service.category !== category) return false;
    if (search === "cras" && !service.id.startsWith("cras-")) return false;
    if (search === "cpf" && service.id !== "receita-federal-pav") return false;
    return matchesCatalogTerms(terms, index);
  }).map(entry => entry.service);
}
