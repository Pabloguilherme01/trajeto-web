import type { CityAtlasItem } from "./cityAtlas";
let loaded: CityAtlasItem[] = [];
export function getLoadedBusinessCatalog() { return loaded; }
export function setLoadedBusinessCatalog(items: CityAtlasItem[]) { loaded = items; }

export function hasBusinessName(value: string) { return /\p{L}/u.test(value); }
