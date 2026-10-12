import { distanceKm } from "./offlineRouteMath";
import { fuelFilterPriceKey, stationCoordinateWithFallback, type StationFuelFilter } from "./stationListControls";

type StationDirectorySortable = {
  key: string;
  local?: {
    displayName?: string | null;
    brand?: string | null;
    mapData?: { observedBrand?: string | null } | null;
    anp?: { latitude?: number | null; longitude?: number | null } | null;
  } | null;
  anp?: {
    razaoSocial?: string | null;
    distribuidora?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};
type PriceRecord = { productKey: string; salePrice: number };
export type StationDirectorySort = "name" | "brand" | "price" | "distance";

// Reuse one locale-aware comparator rather than resolving pt-BR collation
// on every O(n log n) comparison during name, brand and tie-break sorting.
const stationCollator = new Intl.Collator("pt-BR");

/**
 * Preserve original sorting and tie-breaks, but prepare expensive price
 * lookups, coordinate validation and Haversine distances exactly once per
 * visible matching row instead of once for every sort comparator call.
 */
export function sortStationDirectoryRows<T extends StationDirectorySortable>(
  rows: readonly T[],
  sortBy: StationDirectorySort,
  userCoords: { lat: number; lng: number } | null,
  fuelFilter: StationFuelFilter,
  pricesByCnpj: ReadonlyMap<string, readonly PriceRecord[]>,
): T[] {
  const effectiveSort = sortBy === "distance" && !userCoords ? "name" : sortBy;
  const productKey = effectiveSort === "price" ? fuelFilterPriceKey(fuelFilter) : null;
  const prepared = rows.map(row => {
    const label = row.local?.displayName || row.anp?.razaoSocial || "";
    let metric = Number.POSITIVE_INFINITY;
    if (effectiveSort === "distance" && userCoords) {
      const point = stationCoordinateWithFallback(row.anp, row.local?.anp);
      if (point) metric = distanceKm(userCoords, point);
    } else if (productKey) {
      metric = pricesByCnpj.get(row.key)?.find(price => price.productKey === productKey)?.salePrice
        ?? Number.POSITIVE_INFINITY;
    }
    const brand = effectiveSort === "brand"
      ? row.anp?.distribuidora || row.local?.brand || row.local?.mapData?.observedBrand || "Sem bandeira"
      : "";
    return { row, label, metric, brand };
  });
  prepared.sort((a, b) => {
    if (effectiveSort === "distance" || effectiveSort === "price")
      return a.metric - b.metric || stationCollator.compare(a.label, b.label);
    if (effectiveSort === "brand")
      return stationCollator.compare(a.brand, b.brand) || stationCollator.compare(a.label, b.label);
    return stationCollator.compare(a.label, b.label);
  });
  return prepared.map(entry => entry.row);
}
