import { distanceKm } from "./offlineRouteMath";
import { fuelFilterPriceKey, stationCoordinatePoint, type StationFuelFilter } from "./stationListControls";

type StationDirectorySortable = {
  key: string;
  local?: {
    displayName?: string | null;
    brand?: string | null;
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
      const point = stationCoordinatePoint(
        row.anp?.latitude ?? row.local?.anp?.latitude,
        row.anp?.longitude ?? row.local?.anp?.longitude,
      );
      if (point) metric = distanceKm(userCoords, point);
    } else if (productKey) {
      metric = pricesByCnpj.get(row.key)?.find(price => price.productKey === productKey)?.salePrice
        ?? Number.POSITIVE_INFINITY;
    }
    const brand = effectiveSort === "brand"
      ? row.anp?.distribuidora || row.local?.brand || "Sem bandeira"
      : "";
    return { row, label, metric, brand };
  });
  prepared.sort((a, b) => {
    if (effectiveSort === "distance" || effectiveSort === "price")
      return a.metric - b.metric || a.label.localeCompare(b.label, "pt-BR");
    if (effectiveSort === "brand")
      return a.brand.localeCompare(b.brand, "pt-BR") || a.label.localeCompare(b.label, "pt-BR");
    return a.label.localeCompare(b.label, "pt-BR");
  });
  return prepared.map(entry => entry.row);
}
