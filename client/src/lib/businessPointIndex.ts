import { normalizeCatalogText } from "./catalogSearch";
import { hasBusinessName } from "./businessCatalogState";
import type { CityAtlasItem } from "./cityAtlas";

// Catalog arrays are immutable after loading. WeakMap keeps indexes tied to
// their source arrays without retaining catalogs that are no longer referenced.
type Match = CityAtlasItem | null;
const cnpjIndexes = new WeakMap<CityAtlasItem[], Map<string, Match>>();
const nameIndexes = new WeakMap<CityAtlasItem[], Map<string, Match>>();

function register(index: Map<string, Match>, key: string, item: CityAtlasItem) {
  const previous = index.get(key);
  if (previous === undefined) index.set(key, item);
  else if (previous !== item) index.set(key, null);
}

function cnpjIndex(items: CityAtlasItem[]) {
  let index = cnpjIndexes.get(items);
  if (!index) {
    index = new Map();
    for (const item of items) {
      if (!item.business) continue;
      register(index, item.business.cnpj.replace(/\D/g, ""), item);
    }
    cnpjIndexes.set(items, index);
  }
  return index;
}

function nameIndex(items: CityAtlasItem[]) {
  let index = nameIndexes.get(items);
  if (!index) {
    index = new Map();
    for (const item of items) {
      if (!item.business) continue;
      // Each record may repeat its own business name across multiple fields.
      // Registering the same item more than once must not imply ambiguity.
      for (const name of [item.name, item.business.legalName, item.business.tradeName]) {
        if (hasBusinessName(name)) register(index, normalizeCatalogText(name), item);
      }
    }
    nameIndexes.set(items, index);
  }
  return index;
}

/**
 * Resolve only a unique, catalog-sourced business identity.
 * CNPJ lookups avoid building the substantially larger name index; repeated
 * name lookups reuse normalized names rather than scanning all companies.
 * An address, CEP or shared business name cannot create a location.
 */
export function resolveBusinessPointFromCatalog(items: CityAtlasItem[], value: string) {
  const query = normalizeCatalogText(value);
  if (!query) return null;

  const digits = value.replace(/\D/g, "");
  const byCnpj = digits.length === 14 ? cnpjIndex(items).get(digits) : undefined;
  // All indexed business names contain letters, so a numeric-only CNPJ
  // cannot match a name; skip the name index for this frequent case.
  const byName = hasBusinessName(query) ? nameIndex(items).get(query) : undefined;
  if (byCnpj === null || byName === null || (byCnpj && byName && byCnpj !== byName)) return null;
  const item = byCnpj ?? byName;
  if (!item || typeof item.lat !== "number" || typeof item.lng !== "number") return null;
  return { lat: item.lat, lng: item.lng };
}
