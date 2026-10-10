import { filterCityAtlas, type CityAtlasItem, type CityAtlasLayer } from "./cityAtlas";
import { normalizeCatalogText } from "./catalogSearch";

const categories: Record<string, CityAtlasLayer> = {
  alimentacao: "alimentacao", comer: "alimentacao", restaurantes: "alimentacao",
  compras: "compras", lojas: "compras", educacao: "educacao", saude: "saude",
  transporte: "transporte", servicos: "servicos",
};
const categoryIndex = new WeakMap<CityAtlasItem[], Map<CityAtlasLayer, CityAtlasItem[]>>();
function categoryItems(items: CityAtlasItem[], category: CityAtlasLayer) {
  let index = categoryIndex.get(items);
  if (!index) {
    index = new Map();
    for (const item of items) {
      const group = index.get(item.category) ?? [];
      group.push(item);
      index.set(item.category, group);
    }
    categoryIndex.set(items, index);
  }
  return index.get(category) ?? [];
}
const terms: Record<string, string[]> = {
  farmacia: ["farmaceutic"], farmacias: ["farmaceutic"], mercado: ["supermercado", "minimercado", "mercearia"],
  mercados: ["supermercado", "minimercado", "mercearia"], oficinas: ["reparacao mecanica"], padarias: ["padaria"],
};
export function searchBusinesses(items: CityAtlasItem[], query: string) {
  const value = normalizeCatalogText(query);
  if (!value) return [];
  const category = categories[value];
  if (category) return categoryItems(items, category);
  if (!terms[value]) return filterCityAtlas(items, query, "todos");
  const matches = new Map<string, CityAtlasItem>();
  for (const term of terms[value]) for (const item of filterCityAtlas(items, term, "todos")) matches.set(item.id, item);
  return [...matches.values()];
}
