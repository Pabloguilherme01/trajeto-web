import type { StationDirectoryFacetFilters } from "./stationDirectoryFacets";

export type StationDirectoryPreset = "all" | "anp" | "route" | "address";
export type StationDirectoryMode = StationDirectoryPreset | "custom";

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
