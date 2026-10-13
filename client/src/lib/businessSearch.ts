import { cityAtlasSearchText, filterCityAtlas } from "./cityAtlasSearch";
import type { CityAtlasItem, CityAtlasLayer } from "./cityAtlas";
import { hasBusinessName } from "./businessCatalogState";
import { normalizeCatalogText } from "./catalogSearch";

const categories: Record<string, CityAtlasLayer> = {
  alimentacao: "alimentacao", comer: "alimentacao", restaurantes: "alimentacao",
  compras: "compras", lojas: "compras", educacao: "educacao", saude: "saude",
  transporte: "transporte", servicos: "servicos",
};
const categoryIndex = new WeakMap<CityAtlasItem[], {
  groups: Map<CityAtlasLayer, CityAtlasItem[]>;
  ranked: Set<CityAtlasLayer>;
}>();
function categoryItems(items: CityAtlasItem[], category: CityAtlasLayer) {
  let index = categoryIndex.get(items);
  if (!index) {
    const groups = new Map<CityAtlasLayer, CityAtlasItem[]>();
    for (const item of items) {
      const group = groups.get(item.category) ?? [];
      group.push(item);
      groups.set(item.category, group);
    }
    index = { groups, ranked: new Set() };
    categoryIndex.set(items, index);
  }
  const group = index.groups.get(category);
  if (!group) return [];
  if (!index.ranked.has(category)) {
    // The old comparator ranked businesses with a readable trade name first.
    // Stable partition has the exact same order without sorting O(n log n),
    // and we only do it for the category someone actually opened.
    const named: CityAtlasItem[] = [];
    const unnamed: CityAtlasItem[] = [];
    for (const item of group) {
      (hasBusinessName(item.business?.tradeName ?? "") ? named : unnamed).push(item);
    }
    index.groups.set(category, named.concat(unnamed));
    index.ranked.add(category);
  }
  return index.groups.get(category)!;
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

const identityPartitions = new WeakMap<CityAtlasItem[], { named: CityAtlasItem[]; unnamed: CityAtlasItem[] }>();
/** One partition per immutable result list; switching identity filters reuses it. */
export function partitionBusinessCatalog(items: CityAtlasItem[]) {
  let partition = identityPartitions.get(items);
  if (!partition) {
    partition = { named: [], unnamed: [] };
    for (const item of items) (hasBusinessName(item.name) ? partition.named : partition.unnamed).push(item);
    identityPartitions.set(items, partition);
  }
  return partition;
}
/**
 * Identity-aware map slices are cached against their immutable atlas layer.
 * No second 21k-row partition is needed when switching map or CNPJ tabs.
 * Keep the unfiltered catalogue available for registry-only consultation.
 */
/**
 * The CNPJ directory is not a map layer: keep addressless companies
 * consultable, including records that cannot safely become map markers.
 * Category indexes are shared with the existing search, built lazily.
 */
export function businessesForRegistryLayer(
  items: CityAtlasItem[],
  layer: "todos" | CityAtlasLayer,
): CityAtlasItem[] {
  return layer === "todos" ? items : categoryItems(items, layer);
}

export function businessesForMapLayerByIdentity(
  items: CityAtlasItem[],
  layer: "todos" | CityAtlasLayer,
  identity: "named" | "unnamed",
): CityAtlasItem[] {
  return partitionBusinessCatalog(businessesForMapLayer(items, layer))[identity];
}

export function businessesForMapLayer(items: CityAtlasItem[], layer: "todos" | CityAtlasLayer): CityAtlasItem[] {
  let index = mapLayerIndexes.get(items);
  if (!index) {
    // Most imported catalogs have a destination for every row. In that case
    // reuse the original array instead of allocating another large copy.
    let valid: CityAtlasItem[] | null = null;
    const byLayer = new Map<CityAtlasLayer, CityAtlasItem[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!(item.destination ?? item.address ?? "")) {
        if (!valid) valid = items.slice(0, i);
        continue;
      }
      if (valid) valid.push(item);
      const group = byLayer.get(item.category) ?? [];
      group.push(item);
      byLayer.set(item.category, group);
    }
    index = { all: valid ?? items, byLayer };
    mapLayerIndexes.set(items, index);
  }
  return layer === "todos" ? index.all : index.byLayer.get(layer) ?? [];
}
