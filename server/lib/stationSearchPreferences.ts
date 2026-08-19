export const stationSearchPreferenceDefaults = {
  mappedBrand: "all",
  hoursStatus: "all" as "all" | "open" | "closed" | "unknown",
  sortBy: "distance" as "distance" | "relevance" | "brand" | "hours",
  anpNeighborhood: "all",
  anpBrand: "all",
  resultsPerView: 10 as 5 | 10 | 20,
  economicMode: false,
};

export type StationSearchPreferenceInput = typeof stationSearchPreferenceDefaults;

export function normalizeStationSearchPreferences(input: Partial<StationSearchPreferenceInput>): StationSearchPreferenceInput {
  return {
    mappedBrand: input.mappedBrand?.trim().slice(0, 120) || "all",
    hoursStatus: input.hoursStatus === "open" || input.hoursStatus === "closed" || input.hoursStatus === "unknown" ? input.hoursStatus : "all",
    sortBy: input.sortBy === "relevance" || input.sortBy === "brand" || input.sortBy === "hours" ? input.sortBy : "distance",
    anpNeighborhood: input.anpNeighborhood?.trim().slice(0, 160) || "all",
    anpBrand: input.anpBrand?.trim().slice(0, 120) || "all",
    resultsPerView: input.economicMode === true ? 5 : input.resultsPerView === 5 || input.resultsPerView === 20 ? input.resultsPerView : 10,
    economicMode: input.economicMode === true || input.resultsPerView === 5,
  };
}
