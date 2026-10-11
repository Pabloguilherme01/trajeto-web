import {
  stationSupportsFuel,
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
 * Keep at most six computed fuel selections for one immutable ANP/price
 * snapshot. Switches back to a previously selected fuel do not allocate
 * product arrays or normalize ANP labels for every station again.
 * A new snapshot creates a new matcher, so the cache cannot go stale.
 */
export function createStationDirectoryFuelMatcher<T extends FuelDirectoryCard>(
  cards: readonly T[],
  pricesByCnpj: ReadonlyMap<string, ReadonlyArray<FuelPrice>>,
) {
  const cached = new Map<StationFuelFilter, ReadonlySet<T>>();
  return (fuel: StationFuelFilter): ReadonlySet<T> | null => {
    if (fuel === "all") return null;
    const previous = cached.get(fuel);
    if (previous) return previous;
    const matching = new Set<T>();
    for (const item of cards) {
      if (stationSupportsFuel(
        pricesByCnpj.get(item.key)?.map(record => record.productKey) ?? [],
        item.anp?.products?.map(product => product.produto || "") ?? [],
        fuel,
      )) matching.add(item);
    }
    // Cache size stays bounded by the finite choices in the UI.
    if (SUPPORTED_FUELS.includes(fuel)) cached.set(fuel, matching);
    return matching;
  };
}
