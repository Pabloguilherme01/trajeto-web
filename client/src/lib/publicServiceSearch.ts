import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import type { PublicService, PublicServiceCategory } from "./publicServices";

// The bundled catalog is immutable. Keep the search implementation separate
// from official service records, and do not build text indexes on module import.
type SearchIndex = ReturnType<typeof createCatalogSearchIndex>;
type SearchScope = "concise" | "complete" | "withCategory";
// Services and loaded catalog snapshots are immutable. A category-scoped query
// should not build a normalized text index for every other public service.
// Keep a weak, per-snapshot cache for each of the three search intentions.
const indexes = new WeakMap<readonly PublicService[], Map<SearchScope, WeakMap<PublicService, SearchIndex>>>();
// Keep just the last query per immutable catalog snapshot. Changing favorites,
// resource chips or their display order should not rescan the same text.
const lastMatches = new WeakMap<readonly PublicService[], {
  search: string;
  category: PublicServiceCategory | "todos";
  matches: readonly PublicService[];
}>();
const LINKING_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "para"]);

function indexedService(items: readonly PublicService[], service: PublicService, scope: SearchScope): SearchIndex {
  let byScope = indexes.get(items);
  if (!byScope) {
    byScope = new Map();
    indexes.set(items, byScope);
  }
  let entries = byScope.get(scope);
  if (!entries) {
    entries = new WeakMap();
    byScope.set(scope, entries);
  }
  let index = entries.get(service);
  if (!index) {
    const values = scope === "concise"
      ? [service.name, service.category, service.actionLabel, ...(service.keywords ?? [])]
      : [
        service.name, service.description, service.address, service.phone,
        service.extraPhone, service.guidance, service.actionLabel, service.hours,
        ...(service.keywords ?? []),
        ...(scope === "withCategory" ? [service.category] : []),
      ];
    index = createCatalogSearchIndex(values);
    entries.set(service, index);
  }
  return index;
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

  const cached = lastMatches.get(items);
  if (cached?.search === search && cached.category === category) {
    // Caller-side filtering, pagination and sorting must never mutate a
    // previously cached result.
    return cached.matches.slice();
  }

  if (!search) {
    // Browsing categories still skips text indexing entirely.
    const matches = items.filter(service => category === "todos" || service.category === category);
    lastMatches.set(items, { search, category, matches });
    return matches.slice();
  }

  const terms = search.replace(/[ºª]/g, "").split(" ").filter(Boolean);
  const conciseIntent = /^[a-z0-9]{2,4}$/.test(search);
  const includeCategoryIntent = terms.length <= 2;
  const scope: SearchScope = conciseIntent ? "concise"
    : includeCategoryIntent ? "withCategory" : "complete";
  const matches = items.filter(service => {
    if (category !== "todos" && service.category !== category) return false;
    if (search === "cras" && !service.id.startsWith("cras-")) return false;
    if (search === "cpf" && service.id !== "receita-federal-pav") return false;
    return matchesCatalogTerms(terms, indexedService(items, service, scope));
  });
  lastMatches.set(items, { search, category, matches });
  return matches.slice();
}
