import type { CityAtlasItem } from "./cityAtlas";
let loaded: CityAtlasItem[] = [];
export function getLoadedBusinessCatalog() { return loaded; }
export function setLoadedBusinessCatalog(items: CityAtlasItem[]) { loaded = items; }
