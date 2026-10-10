import { normalizeCatalogText } from "./catalogSearch";
import type { CityAtlasItem } from "./cityAtlas";

export type CityMapCandidate = Pick<CityAtlasItem, "id" | "name" | "lat" | "lng" | "address" | "destination" | "coordinateKind" | "coordinateLabel"> & {
  category?: string;
  source?: "local" | "ANP";
};

/** Keep catalog records intact; create display markers only for this sample. */
export function selectCityMapItems<T extends CityMapCandidate>(groups: readonly (readonly T[])[]) {
  const unique = new Map<string, T>();
  for (const group of groups) for (const item of group) {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng) || Math.abs(item.lat!) > 90 || Math.abs(item.lng!) > 180 || (item.lat === 0 && item.lng === 0)) continue;
    // Companies sharing an approximate street position are distinct CNPJs.
    const key = item.id.startsWith("business-") ? item.id : item.name.toLocaleLowerCase("pt-BR") + "|" + item.lat + "|" + item.lng;
    unique.set(key, item);
  }
  const total = unique.size;
  if (total <= 200) return { items: [...unique.values()], total };
  // The old sampler materialized up to 21k records twice (all + companies)
  // even though the visible map is limited to 200 markers.
  let companyCount = 0;
  const landmarks: T[] = [];
  for (const item of unique.values()) {
    if (item.id.startsWith("business-")) companyCount++;
    else if (landmarks.length < 80) landmarks.push(item);
  }
  if (!companyCount) {
    const items: T[] = [];
    for (const item of unique.values()) {
      if (items.length === 200) break;
      items.push(item);
    }
    return { items, total };
  }
  const slots = Math.min(200 - landmarks.length, companyCount);
  const items = [...landmarks];
  let companyIndex = 0;
  let slotIndex = 0;
  for (const item of unique.values()) {
    if (!item.id.startsWith("business-")) continue;
    if (slotIndex < slots && companyIndex === Math.floor(slotIndex * companyCount / slots)) {
      items.push(item);
      slotIndex++;
      if (slotIndex === slots) break;
    }
    companyIndex++;
  }
  return { items, total };
}

const destinationKeys = new WeakMap<CityAtlasItem, string>();
export function cachedDestinationKey(item: CityAtlasItem) {
  let key = destinationKeys.get(item);
  if (key === undefined) {
    key = normalizeCatalogText(item.destination ?? item.address ?? "");
    destinationKeys.set(item, key);
  }
  return key;
}
