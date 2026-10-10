import { normalizeCatalogText } from "./catalogSearch";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";

const searchIndex = new WeakMap<CityAtlasItem, string>();

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

export function filterCityAtlas(
  items: CityAtlasItem[],
  query: string,
  category: "todos" | CityAtlasLayer,
) {
  const terms = normalizeCatalogText(query).split(" ").filter(Boolean);
  return items.filter(item => {
    if (category !== "todos" && item.category !== category) return false;
    if (!terms.length) return true;
    const text = cityAtlasSearchText(item);
    return terms.every(term => text.includes(term));
  });
}

