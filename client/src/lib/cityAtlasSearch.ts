import { normalizeCatalogText } from "./catalogSearch";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";

const searchIndex = new WeakMap<CityAtlasItem, string>();
// A loaded atlas is stable until replaced by a new snapshot. Index categories
// once per array identity instead of scanning every street when switching to
// a narrow layer or typing in its search field.
const layerIndex = new WeakMap<CityAtlasItem[], Map<CityAtlasLayer, CityAtlasItem[]>>();
// Streets can span source categories; cache this cross-category selection
// separately and never build a text index for non-street records on street-only searches.
const streetIndex = new WeakMap<CityAtlasItem[], CityAtlasItem[]>();
const municipalAreaIndex = new WeakMap<CityAtlasItem[], CityAtlasItem[]>();

// Keep only the latest text filter per immutable candidate list. When a
// keystroke only narrows the query, matching records must be a subset of the
// last result: do not rescan the entire 21k-company catalog.
type FilterSnapshot = { terms: string[]; matches: CityAtlasItem[] };
const lastFilter = new WeakMap<CityAtlasItem[], FilterSnapshot>();

function refinesTerms(previous: readonly string[], next: readonly string[]) {
  return previous.length > 0 && previous.every(term =>
    next.some(candidate => candidate.startsWith(term))
  );
}

export function cityAtlasSearchText(item: CityAtlasItem) {
  let text = searchIndex.get(item);
  if (text === undefined) {
    text = normalizeCatalogText([item.name, item.detail, item.address, item.destination, item.category, ...(item.keywords ?? [])].filter(Boolean).join(" "));
    searchIndex.set(item, text);
  }
  return text;
}

export function prepareCityAtlasSearch(items: CityAtlasItem[]) {
  for (const item of items) cityAtlasSearchText(item);
}

function atlasByLayer(items: CityAtlasItem[], layer: CityAtlasLayer) {
  let index = layerIndex.get(items);
  if (!index) {
    index = new Map();
    for (const item of items) {
      let group = index.get(item.category);
      if (!group) {
        group = [];
        index.set(item.category, group);
      }
      group.push(item);
    }
    layerIndex.set(items, index);
  }
  return index.get(layer) ?? [];
}

function matchAtlasText(candidates: CityAtlasItem[], query: string) {
  const terms = normalizeCatalogText(query).split(" ").filter(Boolean);
  // Empty searches return a fresh complete list and invalidate the previous
  // narrowed snapshot. Neither callers nor pagination may mutate our cache.
  if (!terms.length) {
    lastFilter.delete(candidates);
    return candidates.slice();
  }
  const previous = lastFilter.get(candidates);
  if (previous && terms.length === previous.terms.length &&
    terms.every((term, i) => term === previous.terms[i])) {
    return previous.matches.slice();
  }
  const source = previous && refinesTerms(previous.terms, terms)
    ? previous.matches
    : candidates;
  const matches = source.filter(item => {
    const text = cityAtlasSearchText(item);
    return terms.every(term => text.includes(term));
  });
  lastFilter.set(candidates, { terms, matches });
  return matches.slice();
}

export function filterCityAtlas(
  items: CityAtlasItem[],
  query: string,
  category: "todos" | CityAtlasLayer,
) {
  return matchAtlasText(category === "todos" ? items : atlasByLayer(items, category), query);
}

/** Street-only map layer: skip businesses/services regardless of their category. */
export function filterCityAtlasStreets(items: CityAtlasItem[], query: string) {
  let streets = streetIndex.get(items);
  if (!streets) {
    streets = items.filter(item => item.coordinateKind === "street-midpoint");
    streetIndex.set(items, streets);
  }
  return matchAtlasText(streets, query);
}

/**
 * Only municipal area records; unlike the broad Referências layer, excludes
 * streets and unrelated centers. Index lazily by immutable snapshot identity.
 */
export function filterCityAtlasAreas(items: CityAtlasItem[], query: string) {
  let areas = municipalAreaIndex.get(items);
  if (!areas) {
    areas = items.filter(item => item.id.startsWith("atlas-bairro-") &&
      item.category === "referencia" && item.sourceUrl !== undefined);
    municipalAreaIndex.set(items, areas);
  }
  return matchAtlasText(areas, query);
}
