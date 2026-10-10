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
  // Never expose a mutable cached array to pagination or consumers.
  if (!terms.length) return candidates.slice();
  return candidates.filter(item => {
    const text = cityAtlasSearchText(item);
    return terms.every(term => text.includes(term));
  });
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
