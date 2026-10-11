import {
  normalizeStationFuelProduct,
  normalizedStationProductMatchesFuel,
  type StationFuelFilter,
} from "./stationListControls";

type FuelDirectoryCard = {
  key: string;
  anp?: {
    products?: ReadonlyArray<{ produto?: string | null }> | null;
  } | null;
};
type FuelPrice = { productKey: string };

const SUPPORTED_FUELS: readonly StationFuelFilter[] = [
  "gasolina-comum", "etanol", "diesel-s10", "diesel-s500", "glp-p13", "gnv",
];

/**
 * Keep only six selection sets and normalize each distinct official product
 * label once per immutable ANP/price snapshot. No work happens in "all" mode.
 * Filter switching avoids repeated Unicode normalization and temporary arrays,
 * with no global cache or changes to source records.
 */
export function createStationDirectoryFuelMatcher<T extends FuelDirectoryCard>(
  cards: readonly T[],
  pricesByCnpj: ReadonlyMap<string, ReadonlyArray<FuelPrice>>,
) {
  const cached = new Map<StationFuelFilter, ReadonlySet<T>>();
  const normalizedProductNames = new Map<string, string>();
  const normalizedName = (value: string) => {
    const found = normalizedProductNames.get(value);
    if (found !== undefined) return found;
    const normalized = normalizeStationFuelProduct(value);
    normalizedProductNames.set(value, normalized);
    return normalized;
  };
  return (fuel: StationFuelFilter): ReadonlySet<T> | null => {
    if (fuel === "all") return null;
    const previous = cached.get(fuel);
    if (previous) return previous;
    const matching = new Set<T>();
    for (const item of cards) {
      // Price evidence takes priority; avoid touching ANP labels when it
      // already establishes the selected fuel, just like the original check.
      if (pricesByCnpj.get(item.key)?.some(record => record.productKey === fuel) ||
          item.anp?.products?.some(product =>
            normalizedStationProductMatchesFuel(normalizedName(product.produto || ""), fuel)
          )) {
        matching.add(item);
      }
    }
    // Cache size stays bounded by the finite choices in the UI.
    if (SUPPORTED_FUELS.includes(fuel)) cached.set(fuel, matching);
    return matching;
  };
}
