import type { StationDirectoryFacet, StationDirectoryFacetFilters } from "./stationDirectoryFacets";

export type StationDirectoryPreset = "all" | "anp" | "route" | "address";
export type StationDirectoryMode = StationDirectoryPreset | "custom";
export type StationDirectoryModeCounts = Record<StationDirectoryPreset, number>;

/** Count the outcome of each preset in one pass over the existing text/fuel matches. */
export function countStationDirectoryModes<T>(
  searched: readonly T[],
  facets: ReadonlyMap<T, StationDirectoryFacet>,
  fuelMatches: ReadonlySet<T> | null,
): StationDirectoryModeCounts {
  const counts = { all: 0, anp: 0, route: 0, address: 0 };
  for (const card of searched) {
    if (fuelMatches && !fuelMatches.has(card)) continue;
    const facet = facets.get(card);
    counts.all++;
    if (facet?.hasAnp) counts.anp++;
    if (facet?.hasCoordinates) counts.route++;
    if (facet?.hasAddress) counts.address++;
  }
  return counts;
}

/**
 * Quick modes affect only evidence/coverage facets. Text, fuel and ordering
 * remain in place so a user can refine a search without losing their work.
 */
export function criteriaForStationDirectoryPreset(
  preset: StationDirectoryPreset,
): StationDirectoryFacetFilters {
  return {
    neighborhood: "all",
    brand: "all",
    anpOnly: preset === "anp",
    coordinatesOnly: preset === "route",
    addressOnly: preset === "address",
  };
}

export function getStationDirectoryMode(
  filters: StationDirectoryFacetFilters,
): StationDirectoryMode {
  if (filters.neighborhood !== "all" || filters.brand !== "all") return "custom";
  const enabled = Number(filters.anpOnly) + Number(filters.addressOnly) + Number(filters.coordinatesOnly);
  if (enabled > 1) return "custom";
  if (filters.anpOnly) return "anp";
  if (filters.coordinatesOnly) return "route";
  if (filters.addressOnly) return "address";
  return "all";
}
