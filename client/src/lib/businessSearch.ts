import { cityAtlasSearchText, filterCityAtlas } from "./cityAtlasSearch";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";
import { hasBusinessName } from "./businessCatalogState";
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
    for (const group of index.values()) group.sort((a, b) => Number(hasBusinessName(b.business?.tradeName ?? "")) - Number(hasBusinessName(a.business?.tradeName ?? "")));
    categoryIndex.set(items, index);
  }
  return index.get(category) ?? [];
}
const aliases: Record<string, string> = {
  farmacia: "farmacias", farmacias: "farmacias", mercado: "mercados", mercados: "mercados",
  oficina: "oficinas", oficinas: "oficinas", padaria: "padarias", padarias: "padarias",
  roupa: "roupas", roupas: "roupas", vestuario: "roupas", beleza: "beleza", materiais: "materiais",
};
const terms: Record<string, readonly string[]> = {
  farmacias: ["farmaceutic"], mercados: ["supermercado", "minimercado", "mercearia"],
  oficinas: ["reparacao mecanica"], padarias: ["padaria"],
  roupas: ["vestuario"], beleza: ["cabeleireiro", "manicure", "tratamento de beleza"],
  materiais: ["materiais de construcao", "ferragens", "tintas e materiais para pintura", "material eletrico"],
};
// Only finite, predefined filters are cached; free-text searches do not grow a cache.
const aliasResults = new WeakMap<CityAtlasItem[], Map<string, CityAtlasItem[]>>();
const cnpjIndexes = new WeakMap<CityAtlasItem[], Map<string, CityAtlasItem>>();
function companyByCnpj(items: CityAtlasItem[], digits: string) {
  let index = cnpjIndexes.get(items);
  if (!index) {
    index = new Map();
    for (const item of items) if (item.business) index.set(item.business.cnpj.replace(/\D/g, ""), item);
    cnpjIndexes.set(items, index);
  }
  const company = index.get(digits);
  return company ? [company] : [];
}
export function searchBusinesses(items: CityAtlasItem[], query: string) {
  const value = normalizeCatalogText(query);
  if (!value) return [];
  const category = categories[value];
  if (category) return categoryItems(items, category);
  const alias = aliases[value];
  if (!alias) {
    const digits = value.replace(/\D/g, "");
    const exactCnpj = /^[\d\s./-]+$/.test(value) && digits.length === 14;
    return exactCnpj ? companyByCnpj(items, digits) : filterCityAtlas(items, value, "todos");
  }
  let cache = aliasResults.get(items);
  if (!cache) { cache = new Map(); aliasResults.set(items, cache); }
  let matches = cache.get(alias);
  if (!matches) {
    const seen = new Set<string>();
    matches = items.filter(item => {
      if (seen.has(item.id) || !terms[alias].some(term => cityAtlasSearchText(item).includes(term))) return false;
      seen.add(item.id);
      return true;
    });
    cache.set(alias, matches);
  }
  return matches;
}


/**
 * Keep map category lists keyed by the immutable loaded catalog identity.
 * This avoids filtering thousands of records on every category transition,
 * while preserving imported order, addresses, and all CNPJ records.
 */
const mapLayerIndexes = new WeakMap<CityAtlasItem[], {
  all: CityAtlasItem[];
  byLayer: Map<CityAtlasLayer, CityAtlasItem[]>;
}>();
export function businessesForMapLayer(items: CityAtlasItem[], layer: "todos" | CityAtlasLayer): CityAtlasItem[] {
  let index = mapLayerIndexes.get(items);
  if (!index) {
    const all: CityAtlasItem[] = [];
    const byLayer = new Map<CityAtlasLayer, CityAtlasItem[]>();
    for (const item of items) {
      // The map has never presented a record without a destination/address.
      if (!(item.destination ?? item.address ?? "")) continue;
      all.push(item);
      const group = byLayer.get(item.category) ?? [];
      group.push(item);
      byLayer.set(item.category, group);
    }
    index = { all, byLayer };
    mapLayerIndexes.set(items, index);
  }
  return layer === "todos" ? index.all : index.byLayer.get(layer) ?? [];
}
