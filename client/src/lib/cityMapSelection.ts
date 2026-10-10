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
  const all = [...unique.values()];
  if (all.length <= 200) return { items: all, total: all.length };
  const companies = all.filter(item => item.id.startsWith("business-"));
  if (!companies.length) return { items: all.slice(0, 200), total: all.length };
  const landmarks = all.filter(item => !item.id.startsWith("business-")).slice(0, 80);
  const slots = Math.min(200 - landmarks.length, companies.length);
  return { items: [...landmarks, ...Array.from({ length: slots }, (_, index) => companies[Math.floor(index * companies.length / slots)])], total: all.length };
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
