export const stationSearchPreferenceDefaults = {
  mappedBrand: "all",
  hoursStatus: "all" as "all" | "open" | "closed" | "unknown",
  sortBy: "distance" as "distance" | "relevance" | "brand" | "hours",
  anpNeighborhood: "all",
  anpBrand: "all",
};

export type StationSearchPreferenceInput = typeof stationSearchPreferenceDefaults;

export function normalizeStationSearchPreferences(input: Partial<StationSearchPreferenceInput>): StationSearchPreferenceInput {
  return {
    mappedBrand: input.mappedBrand?.trim().slice(0, 120) || "all",
    hoursStatus: input.hoursStatus === "open" || input.hoursStatus === "closed" || input.hoursStatus === "unknown" ? input.hoursStatus : "all",
    sortBy: input.sortBy === "relevance" || input.sortBy === "brand" || input.sortBy === "hours" ? input.sortBy : "distance",
    anpNeighborhood: input.anpNeighborhood?.trim().slice(0, 160) || "all",
    anpBrand: input.anpBrand?.trim().slice(0, 120) || "all",
  };
}
